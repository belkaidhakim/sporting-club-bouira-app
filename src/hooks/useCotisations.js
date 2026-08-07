import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export function useCotisations() {
  const [cotisations, setCotisations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCotisations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cotisations')
        .select(`
          *,
          athletes(nom, prenom, groupe)
        `)
        .order('date_paiement', { ascending: false });

      if (error) throw error;
      setCotisations(data || []);
      setError(null);
    } catch (err) {
      console.error('Erreur fetchCotisations:', err);
      setError(err.message);
      toast.error('Erreur lors du chargement des finances');
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCotisation = async (id) => {
    try {
      const { error } = await supabase
        .from('cotisations')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCotisations(prev => prev.filter(c => c.id !== id));
      toast.success("Paiement supprimé");
      return true;
    } catch (err) {
      console.error('Erreur deleteCotisation:', err);
      toast.error("Erreur lors de la suppression");
      return false;
    }
  };

  return {
    cotisations,
    loading,
    error,
    fetchCotisations,
    deleteCotisation
  };
}
