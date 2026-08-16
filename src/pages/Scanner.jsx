import React, { useState, useEffect, useCallback } from 'react';
import { Scanner as QRScanner } from '@yudiel/react-qr-scanner';
import { supabase } from '../supabaseClient';
import { CheckCircle2, XCircle, Users, Wifi, WifiOff, Volume2, VolumeX, RefreshCw, Sparkles } from 'lucide-react';
import BadgeGenerator from '../components/BadgeGenerator';
import { soundController } from '../utils/audioFeedback';
import toast from 'react-hot-toast';

const OFFLINE_QUEUE_KEY = 'scb_offline_presences_queue';
const ATHLETES_CACHE_KEY = 'scb_cached_athletes_v1';

export default function Scanner() {
  const [scanResult, setScanResult] = useState(null);
  const [athleteData, setAthleteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [entryCount, setEntryCount] = useState(0);

  // État de connexion & file hors-ligne
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  });
  
  // Préférences sonores et auto-reset
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoResetSeconds, setAutoResetSeconds] = useState(4); // 0 = désactivé

  // Sauvegarder la file d'attente hors-ligne
  const saveOfflineQueue = (newQueue) => {
    setOfflineQueue(newQueue);
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(newQueue));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  };

  // Mettre en cache les athlètes pour la validation hors-ligne
  const updateAthletesCache = useCallback(async () => {
    if (!navigator.onLine) return;
    try {
      const { data, error } = await supabase
        .from('athletes')
        .select(`
          id, nom, prenom, photo_url, token_qr, est_actif, groupe,
          cartes_acces (statut, date_dernier_paiement),
          cotisations (periode_couverte_fin)
        `)
        .eq('est_actif', true);

      if (!error && data) {
        localStorage.setItem(ATHLETES_CACHE_KEY, JSON.stringify(data));
      }
    } catch (e) {
      console.warn('Cache update failed:', e);
    }
  }, []);

  // Synchronisation des pointages hors-ligne vers Supabase
  const syncOfflinePresences = useCallback(async () => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    if (queue.length === 0 || !navigator.onLine) return;

    const toastId = toast.loading(`Synchronisation de ${queue.length} pointage(s) hors-ligne...`);
    let successCount = 0;
    const remainingQueue = [];

    for (const item of queue) {
      try {
        const { error } = await supabase
          .from('presences')
          .insert([{ athlete_id: item.athlete_id, created_at: item.date }]);

        if (!error || error.code === '23505') {
          successCount++;
        } else {
          remainingQueue.push(item);
        }
      } catch {
        remainingQueue.push(item);
      }
    }

    saveOfflineQueue(remainingQueue);
    if (successCount > 0) {
      toast.success(`${successCount} pointage(s) synchronisé(s) avec succès !`, { id: toastId });
    } else {
      toast.dismiss(toastId);
    }
  }, []);

  // Écoute des événements réseau
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connexion rétablie !');
      syncOfflinePresences();
      updateAthletesCache();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast('Mode Hors-Ligne activé. Les scans seront enregistrés localement.', {
        icon: '📶',
        duration: 4000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initialisation du cache
    updateAthletesCache();
    syncOfflinePresences();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflinePresences, updateAthletesCache]);

  // Détection du Scan QR
  const handleScan = async (detectedCodes) => {
    if (loading || scanResult || !detectedCodes || detectedCodes.length === 0) return;
    
    const decodedText = detectedCodes[0].rawValue;
    setScanResult(decodedText);
    setLoading(true);
    
    try {
      let athlete = null;

      // 1. Recherche en ligne si connecté
      if (navigator.onLine) {
        try {
          const { data, error } = await supabase
            .from('athletes')
            .select(`
              *,
              cartes_acces (statut, date_dernier_paiement),
              cotisations (periode_couverte_fin)
            `)
            .eq('token_qr', decodedText)
            .eq('est_actif', true)
            .single();

          if (!error && data) {
            athlete = data;
          }
        } catch (netErr) {
          console.warn('Network query failed, falling back to cache:', netErr);
        }
      }

      // 2. Fallback cache local si hors-ligne ou erreur réseau
      if (!athlete) {
        try {
          const cached = JSON.parse(localStorage.getItem(ATHLETES_CACHE_KEY) || '[]');
          athlete = cached.find(a => a.token_qr === decodedText) || null;
        } catch (cacheErr) {
          console.warn('Cache lookup failed:', cacheErr);
        }
      }
        
      if (!athlete) {
        if (soundEnabled) soundController.playError();
        setAthleteData({ error: 'Membre introuvable ou QR code invalide.' });
      } else {
        const statut = athlete.cartes_acces?.statut || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut);
        let alreadyScanned = false;

        if (statut === 'ACTIVE') {
          if (navigator.onLine) {
            const { error: insertError } = await supabase
              .from('presences')
              .insert([{ athlete_id: athlete.id }]);
            
            if (insertError) {
              if (insertError.code === '23505') {
                alreadyScanned = true;
              } else {
                toast.error("Erreur d'enregistrement: " + insertError.message);
              }
            } else {
              setEntryCount(prev => prev + 1);
            }
          } else {
            // Mode hors-ligne : Sauvegarder dans la file d'attente
            const newQueueItem = {
              athlete_id: athlete.id,
              nom: athlete.nom,
              prenom: athlete.prenom,
              date: new Date().toISOString()
            };
            const updatedQueue = [...offlineQueue, newQueueItem];
            saveOfflineQueue(updatedQueue);
            setEntryCount(prev => prev + 1);
          }

          if (alreadyScanned) {
            if (soundEnabled) soundController.playWarning();
          } else {
            if (soundEnabled) soundController.playSuccess();
          }
        } else {
          // Statut non actif (suspendu / impayé)
          if (soundEnabled) soundController.playError();
        }

        setAthleteData({ ...athlete, alreadyScanned });
      }
    } catch {
      if (soundEnabled) soundController.playError();
      setAthleteData({ error: 'Erreur lors de la vérification du badge.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = useCallback(() => {
    setScanResult(null);
    setAthleteData(null);
  }, []);

  // Auto-reset après N secondes
  useEffect(() => {
    if (athleteData && autoResetSeconds > 0) {
      const timer = setTimeout(() => {
        handleReset();
      }, autoResetSeconds * 1000);
      return () => clearTimeout(timer);
    }
  }, [athleteData, autoResetSeconds, handleReset]);

  const getStatusDisplay = () => {
    if (!athleteData) return null;
    
    if (athleteData.error) {
      return (
        <div style={{
          backgroundColor: 'rgba(220, 38, 38, 0.96)',
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '2rem',
          backdropFilter: 'blur(10px)',
          animation: 'pulse 1.5s infinite'
        }}>
          <XCircle size={90} className="mb-4 text-white" />
          <h2 style={{ fontSize: '2.4rem', fontWeight: 900, marginBottom: '1rem', color: 'white', letterSpacing: '1px' }}>
            ACCÈS REFUSÉ
          </h2>
          <p style={{ fontSize: '1.25rem', textAlign: 'center', maxWidth: '500px', opacity: 0.95 }}>
            {athleteData.error}
          </p>
          <button 
            className="btn mt-8" 
            style={{ backgroundColor: 'white', color: '#dc2626', fontWeight: 800, padding: '1rem 2.5rem', fontSize: '1.1rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} 
            onClick={handleReset}
          >
            Scanner un autre badge
          </button>
        </div>
      );
    }

    const statut = athleteData.cartes_acces?.statut || (Array.isArray(athleteData.cartes_acces) && athleteData.cartes_acces[0]?.statut);
    const isGranted = statut === 'ACTIVE';

    if (isGranted) {
      return (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.96)',
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)'
        }}>
          <CheckCircle2 size={85} className="mb-2 text-white" />
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: athleteData.alreadyScanned ? '0.4rem' : '1.5rem', color: 'white', letterSpacing: '1px' }}>
            ACCÈS AUTORISÉ
          </h2>
          
          {athleteData.alreadyScanned && (
            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.95)', padding: '0.35rem 1.25rem', borderRadius: '9999px', fontSize: '0.9rem', fontWeight: 800, marginBottom: '1rem', color: 'white', letterSpacing: '1px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
              ⚠️ DÉJÀ POINTÉ AUJOURD'HUI
            </div>
          )}

          {!isOnline && (
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.9)', padding: '0.25rem 1rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.85rem', color: 'white' }}>
              📶 Enregistré hors-ligne (en attente de sync)
            </div>
          )}
          
          <div style={{ transform: 'scale(0.85)', margin: '-1rem 0' }}>
            <BadgeGenerator athlete={athleteData} showEndDate={true} />
          </div>
          
          <button 
            className="btn mt-4" 
            style={{ backgroundColor: 'white', color: '#10b981', fontWeight: 800, padding: '0.85rem 2.5rem', fontSize: '1.1rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} 
            onClick={handleReset}
          >
            Scanner Suivant ({autoResetSeconds > 0 ? `${autoResetSeconds}s` : 'Manuel'})
          </button>
        </div>
      );
    } else {
      return (
        <div style={{
          backgroundColor: 'rgba(220, 38, 38, 0.96)',
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          padding: '1.5rem',
          backdropFilter: 'blur(10px)'
        }}>
          <XCircle size={85} className="mb-2 text-white" />
          <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '1rem', color: 'white', letterSpacing: '1px' }}>
            ACCÈS REFUSÉ
          </h2>
          
          <div style={{ transform: 'scale(0.85)', margin: '-1rem 0' }}>
            <BadgeGenerator athlete={athleteData} showEndDate={true} />
          </div>
          
          <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '0.85rem 1.5rem', borderRadius: '12px', textAlign: 'center', width: '100%', maxWidth: '380px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.2)' }}>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#fca5a5' }}>
              MOTIF : CARTE {statut === 'SUSPENDED' ? 'SUSPENDUE (COTISATION EXPIRÉE)' : (statut || 'NON VALIDÉE')}
            </p>
          </div>
          
          <button 
            className="btn mt-5" 
            style={{ backgroundColor: 'white', color: '#dc2626', fontWeight: 800, padding: '0.85rem 2.5rem', fontSize: '1.1rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} 
            onClick={handleReset}
          >
            Scanner Suivant
          </button>
        </div>
      );
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', display: 'flex', flexDirection: 'column', color: 'white', fontFamily: 'Outfit, sans-serif' }}>
      {/* HEADER DU SCANNER AVEC STATUT RÉSEAU & COMPTEURS */}
      <div style={{ padding: '0.85rem 1.25rem', backgroundColor: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            Scanner de Contrôle Bassin
          </h1>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
            Pointage instantané des accès par badge QR
          </p>
        </div>
        
        {/* BARRE D'OUTILS ET BADGES */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Badge Réseau / Mode Hors-Ligne */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              padding: '0.35rem 0.75rem', 
              borderRadius: '9999px', 
              fontSize: '0.75rem', 
              fontWeight: 700,
              backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isOnline ? '#10b981' : '#ef4444',
              border: `1px solid ${isOnline ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
            }}
          >
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isOnline ? 'En ligne' : 'Hors-Ligne'}</span>
          </div>

          {/* Pointages hors-ligne en attente */}
          {offlineQueue.length > 0 && (
            <button
              onClick={syncOfflinePresences}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                cursor: 'pointer'
              }}
              title="Cliquer pour forcer la synchronisation"
            >
              <RefreshCw size={13} />
              <span>{offlineQueue.length} en attente</span>
            </button>
          )}

          {/* Bouton Son On/Off */}
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            style={{
              padding: '0.45rem',
              borderRadius: '8px',
              backgroundColor: soundEnabled ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.08)',
              color: soundEnabled ? '#10b981' : '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title={soundEnabled ? 'Désactiver le son' : 'Activer le son'}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* Compteur d'entrées aujourd'hui */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(99, 102, 241, 0.18)', padding: '0.35rem 0.85rem', borderRadius: '9999px', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.35)' }}>
            <Users size={16} />
            <span style={{ fontSize: '0.95rem', fontWeight: 800 }}>{entryCount} scan(s)</span>
          </div>
        </div>
      </div>
      
      {/* ZONE DE SCANNER */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1.5rem', maxWidth: '520px', margin: '0 auto', width: '100%' }}>
        {!scanResult && (
          <div style={{ width: '100%', borderRadius: '18px', overflow: 'hidden', border: '2px solid rgba(99, 102, 241, 0.4)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)', backgroundColor: '#000' }}>
            <QRScanner onScan={handleScan} />
          </div>
        )}
        <p style={{ marginTop: '1.25rem', fontSize: '0.85rem', color: '#94a3b8', textAlign: 'center' }}>
          💡 Présentez le badge QR devant la caméra. La validation et le retour sonore sont automatiques.
        </p>
      </div>
      
      {getStatusDisplay()}
    </div>
  );
}
