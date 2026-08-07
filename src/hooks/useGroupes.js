import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export function useGroupes() {
  const [groupes, setGroupes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGroupes = useCallback(async () => {
    try {
      setLoading(true);
      // On récupère les groupes avec le nom de l'entraîneur et le nombre d'athlètes (pour calculer le remplissage)
      const { data, error } = await supabase
        .from('groupes')
        .select(`
          *,
          profiles:entraineur_id (email),
          athletes (id)
        `)
        .order('nom', { ascending: true });

      if (error) throw error;
      setGroupes(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des groupes:', err);
      toast.error('Impossible de charger les groupes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroupes();
  }, [fetchGroupes]);

  return { groupes, loading, fetchGroupes };
}
