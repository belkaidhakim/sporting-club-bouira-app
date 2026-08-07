import React, { useState } from 'react';
import { Scanner as QRScanner } from '@yudiel/react-qr-scanner';
import { supabase } from '../supabaseClient';
import { CheckCircle2, XCircle, Users } from 'lucide-react';
import BadgeGenerator from '../components/BadgeGenerator';

export default function Scanner() {
  const [scanResult, setScanResult] = useState(null);
  const [athleteData, setAthleteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [entryCount, setEntryCount] = useState(0);

  const handleScan = async (detectedCodes) => {
    if (loading || scanResult || !detectedCodes || detectedCodes.length === 0) return;
    
    const decodedText = detectedCodes[0].rawValue;
    setScanResult(decodedText);
    setLoading(true);
    
    try {
      // Find athlete with this token
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
        
      if (error || !data) {
        setAthleteData({ error: 'Membre introuvable ou QR code invalide.' });
      } else {
        const statut = data.cartes_acces?.statut || (Array.isArray(data.cartes_acces) && data.cartes_acces[0]?.statut);
        let alreadyScanned = false;

        if (statut === 'ACTIVE') {
          // Attempt to insert presence
          const { error: insertError } = await supabase
            .from('presences')
            .insert([{ athlete_id: data.id }]);
          
          if (insertError) {
            // 23505 is PostgreSQL unique violation code
            if (insertError.code === '23505') {
              alreadyScanned = true;
            } else {
              console.error('Erreur insertion présence:', insertError);
            }
          } else {
            setEntryCount(prev => prev + 1);
          }
        }
        setAthleteData({ ...data, alreadyScanned });
      }
    } catch (err) {
      setAthleteData({ error: 'Erreur de connexion à la base de données.' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setAthleteData(null);
  };

  const getStatusDisplay = () => {
    if (!athleteData) return null;
    
    if (athleteData.error) {
      return (
        <div className="bg-red-900/50" style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)', position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '2rem' }}>
          <XCircle size={80} className="mb-4" />
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'white' }}>ACCÈS REFUSÉ</h2>
          <p style={{ fontSize: '1.2rem', textAlign: 'center' }}>{athleteData.error}</p>
          <button className="btn mt-8" style={{ backgroundColor: 'white', color: '#ef4444' }} onClick={handleReset}>Scanner un autre badge</button>
        </div>
      );
    }

    const statut = athleteData.cartes_acces?.statut || (Array.isArray(athleteData.cartes_acces) && athleteData.cartes_acces[0]?.statut);
    const isGranted = statut === 'ACTIVE';

    if (isGranted) {
      return (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.95)', position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '2rem' }}>
          <CheckCircle2 size={80} className="mb-4" />
          <h2 style={{ fontSize: '2rem', marginBottom: athleteData.alreadyScanned ? '0.5rem' : '2rem', color: 'white' }}>ACCÈS AUTORISÉ</h2>
          {athleteData.alreadyScanned && (
            <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.9)', padding: '0.25rem 1rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '1rem', color: 'white', letterSpacing: '1px' }}>
              DÉJÀ SCANNÉ AUJOURD'HUI
            </div>
          )}
          
          <div style={{ transform: 'scale(0.85)', margin: '-1rem 0' }}>
            <BadgeGenerator athlete={athleteData} showEndDate={true} />
          </div>
          
          <button className="btn mt-6" style={{ backgroundColor: 'white', color: '#10b981', padding: '1rem 2rem', fontSize: '1.1rem' }} onClick={handleReset}>Scanner Suivant</button>
        </div>
      );
    } else {
      return (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.95)', position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '2rem' }}>
          <XCircle size={80} className="mb-4" />
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'white' }}>ACCÈS REFUSÉ</h2>
          
          <div style={{ transform: 'scale(0.85)', margin: '-1rem 0' }}>
            <BadgeGenerator athlete={athleteData} showEndDate={true} />
          </div>
          
          <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '1rem', textAlign: 'center', width: '100%', maxWidth: '400px', marginTop: '1rem' }}>
            <p style={{ margin: '0', fontSize: '1.2rem', fontWeight: 'bold', color: '#fca5a5' }}>STATUT : {statut || 'INCONNU'}</p>
          </div>
          
          <button className="btn mt-6" style={{ backgroundColor: 'white', color: '#ef4444', padding: '1rem 2rem', fontSize: '1.1rem' }} onClick={handleReset}>Scanner Suivant</button>
        </div>
      );
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', display: 'flex', flexDirection: 'column', color: 'white' }}>
      <div style={{ padding: '1rem', textAlign: 'center', backgroundColor: '#111', position: 'relative' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Scanner de Contrôle</h1>
        <p style={{ margin: 0, fontSize: '0.9rem', color: '#888' }}>Placez le QR Code dans le cadre</p>
        
        <div style={{ position: 'absolute', right: '1rem', top: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(59, 130, 246, 0.2)', padding: '0.5rem 1rem', borderRadius: '2rem', color: '#60a5fa' }}>
          <Users size={20} />
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{entryCount}</span>
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '1rem', maxWidth: '500px', margin: '0 auto', width: '100%' }}>
        {!scanResult && (
          <div style={{ borderRadius: '1rem', overflow: 'hidden' }}>
            <QRScanner onScan={handleScan} />
          </div>
        )}
      </div>
      
      {getStatusDisplay()}
    </div>
  );
}
