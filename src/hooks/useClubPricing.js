import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

const DEFAULT_PRICING = {
  frais_inscription: 300,
  cotisation_adhesion: 3000
};

export function useClubPricing() {
  const [pricing, setPricing] = useState(() => {
    try {
      const cached = localStorage.getItem('scb_club_pricing');
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          frais_inscription: Number(parsed.frais_inscription) || DEFAULT_PRICING.frais_inscription,
          cotisation_adhesion: Number(parsed.cotisation_adhesion) || DEFAULT_PRICING.cotisation_adhesion
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_PRICING;
  });

  const [loading, setLoading] = useState(false);

  // Charger la tarification
  const fetchPricing = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('club_settings')
        .select('*')
        .eq('key', 'tarification_club')
        .maybeSingle();

      if (!error && data && data.value) {
        const remotePricing = {
          frais_inscription: Number(data.value.frais_inscription) || DEFAULT_PRICING.frais_inscription,
          cotisation_adhesion: Number(data.value.cotisation_adhesion) || DEFAULT_PRICING.cotisation_adhesion
        };
        setPricing(remotePricing);
        localStorage.setItem('scb_club_pricing', JSON.stringify(remotePricing));
      }
    } catch (e) {
      console.warn('Erreur récupération tarification club:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPricing();
  }, [fetchPricing]);

  // Mettre à jour la tarification (Admin)
  const updatePricing = async (newPricing) => {
    const validated = {
      frais_inscription: Math.max(0, Number(newPricing.frais_inscription) || 0),
      cotisation_adhesion: Math.max(0, Number(newPricing.cotisation_adhesion) || 0)
    };

    setPricing(validated);
    localStorage.setItem('scb_club_pricing', JSON.stringify(validated));

    try {
      const { error } = await supabase
        .from('club_settings')
        .upsert({
          key: 'tarification_club',
          value: {
            ...validated,
            updated_at: new Date().toISOString()
          }
        });

      if (error && error.code !== '42P01') {
        console.warn('Erreur sauvegarde tarification Supabase:', error);
      }
      toast.success('Tarification du club mise à jour avec succès !');
      return true;
    } catch (e) {
      console.warn('Erreur update pricing:', e);
      toast.success('Tarifs mis à jour en local.');
      return true;
    }
  };

  const totalAdhesion = pricing.frais_inscription + pricing.cotisation_adhesion;

  return {
    fraisInscription: pricing.frais_inscription,
    cotisationAdhesion: pricing.cotisation_adhesion,
    totalAdhesion,
    loading,
    updatePricing,
    fetchPricing
  };
}
