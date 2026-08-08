import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export function useDepenses() {
  const [depenses, setDepenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDepenses = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('depenses')
        .select(`*`)
        .order('date_depense', { ascending: false });

      if (error) throw error;
      setDepenses(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des dépenses:', err);
      toast.error('Impossible de charger les dépenses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepenses();
  }, [fetchDepenses]);

  return { depenses, loading, fetchDepenses };
}
