import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export function useAthletes() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAthletes = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('athletes')
        .select(`
          *,
          cartes_acces (statut),
          cotisations (periode_couverte_fin)
        `)
        .eq('est_actif', true)
        .order('nom', { ascending: true });

      if (error) throw error;
      setAthletes(data || []);
      setError(null);
    } catch (err) {
      console.error('Erreur fetchAthletes:', err);
      setError(err.message);
      toast.error('Erreur lors du chargement des athlètes');
    } finally {
      setLoading(false);
    }
  }, []);

  const archiveAthlete = async (id) => {
    try {
      const { error } = await supabase
        .from('athletes')
        .update({ est_actif: false })
        .eq('id', id);

      if (error) throw error;
      setAthletes(prev => prev.filter(a => a.id !== id));
      toast.success("Athlète archivé avec succès");
      return true;
    } catch (err) {
      console.error('Erreur archiveAthlete:', err);
      toast.error("Erreur lors de l'archivage");
      return false;
    }
  };

  const toggleAccessStatus = async (athleteId, currentStatusObj) => {
    const currentStatus = Array.isArray(currentStatusObj) ? currentStatusObj[0]?.statut : currentStatusObj?.statut;
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDUE' : 'ACTIVE';
    
    try {
      const { error } = await supabase
        .from('cartes_acces')
        .update({ statut: newStatus })
        .eq('athlete_id', athleteId);
        
      if (error) throw error;
      
      setAthletes(prev => prev.map(a => {
        if (a.id === athleteId) {
          return {
            ...a,
            cartes_acces: Array.isArray(a.cartes_acces)
              ? [{ ...a.cartes_acces[0], statut: newStatus }]
              : { ...a.cartes_acces, statut: newStatus }
          };
        }
        return a;
      }));
      toast.success(`Statut mis à jour : ${newStatus}`);
      return true;
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Erreur lors de la mise à jour du statut');
      return false;
    }
  };

  return {
    athletes,
    loading,
    error,
    fetchAthletes,
    archiveAthlete,
    toggleAccessStatus
  };
}
