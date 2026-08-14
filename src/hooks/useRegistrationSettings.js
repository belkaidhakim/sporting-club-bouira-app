import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export function useRegistrationSettings() {
  const [isOpen, setIsOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  // Charger le statut
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      // 1. Lire depuis le stockage local (valeur instantanée)
      const localVal = localStorage.getItem('scb_inscriptions_ouvertes');
      if (localVal !== null) {
        setIsOpen(localVal === 'true');
      }

      // 2. Tenter de lire depuis Supabase (table club_settings)
      const { data, error } = await supabase
        .from('club_settings')
        .select('*')
        .eq('key', 'inscriptions_ouvertes')
        .maybeSingle();

      if (!error && data && data.value) {
        const remoteOpen = data.value.is_open !== false;
        setIsOpen(remoteOpen);
        localStorage.setItem('scb_inscriptions_ouvertes', remoteOpen ? 'true' : 'false');
      }
    } catch {
      // Ignorer si la table n'existe pas encore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Activer / Désactiver
  const toggleInscriptions = async (newState) => {
    const targetState = typeof newState === 'boolean' ? newState : !isOpen;
    setIsOpen(targetState);
    localStorage.setItem('scb_inscriptions_ouvertes', targetState ? 'true' : 'false');

    try {
      const { error } = await supabase
        .from('club_settings')
        .upsert({
          key: 'inscriptions_ouvertes',
          value: { is_open: targetState, updated_at: new Date().toISOString() }
        });

      if (error && error.code !== '42P01') {
        console.warn('Erreur sauvegarde Supabase settings:', error);
      }
    } catch (e) {
      console.warn('Warning sync settings:', e);
    }

    if (targetState) {
      toast.success('Inscriptions en ligne ACTIVÉES ! Le formulaire public est désormais accessible.');
    } else {
      toast('Inscriptions en ligne DÉSACTIVÉES. Le formulaire public est fermé.', {
        icon: '🔒',
        style: {
          borderRadius: '10px',
          background: '#1e293b',
          color: '#f59e0b',
        },
      });
    }
    return targetState;
  };

  return {
    isOpen,
    loading,
    toggleInscriptions,
    fetchSettings
  };
}
