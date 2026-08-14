import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export function useInscriptions() {
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchInscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inscriptions')
        .select(`
          *,
          groupes (id, nom)
        `)
        .order('date_demande', { ascending: false });

      if (error) {
        // If table doesn't exist yet, gracefully handle without breaking UI
        if (error.code === '42P01' || error.message.includes('relation "public.inscriptions" does not exist')) {
          console.warn('Table inscriptions non encore créée dans Supabase.');
          setInscriptions([]);
          return;
        }
        throw error;
      }
      setInscriptions(data || []);
      setError(null);
    } catch (err) {
      console.error('Erreur fetchInscriptions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Compteur de demandes en attente
  const pendingCount = inscriptions.filter(i => i.statut === 'EN_ATTENTE').length;

  // Valider une inscription et créer l'athlète correspondant
  const validerInscription = async (inscription) => {
    const toastId = toast.loading("Validation et intégration de l'athlète...");
    try {
      // 1. Générer token QR unique
      const token_qr = `SCB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // 2. Insérer dans la table athlètes
      const athletePayload = {
        nom: (inscription.nom || '').trim().toUpperCase(),
        prenom: (inscription.prenom || '').trim(),
        date_naissance: inscription.date_naissance || null,
        sexe: inscription.sexe || null,
        telephone: inscription.telephone || null,
        contact_urgence: inscription.telephone_parent || null,
        observations_medicales: inscription.observations_medicales || null,
        groupe_id: inscription.groupe_id || null,
        groupe: inscription.groupes?.nom || inscription.groupe_nom || null,
        certificat_medical_valide: true,
        photo: inscription.photo || null,
        token_qr: token_qr,
        est_actif: true
      };

      const { data: newAthlete, error: athleteError } = await supabase
        .from('athletes')
        .insert([athletePayload])
        .select()
        .single();

      if (athleteError) throw athleteError;

      // 3. Mettre à jour le statut dans inscriptions
      const { error: updateError } = await supabase
        .from('inscriptions')
        .update({
          statut: 'VALIDE',
          date_traitement: new Date().toISOString()
        })
        .eq('id', inscription.id);

      if (updateError) console.warn('Warning mise à jour statut inscription:', updateError);

      // 4. Mettre à jour l'état local
      setInscriptions(prev => prev.map(item => 
        item.id === inscription.id 
          ? { ...item, statut: 'VALIDE', date_traitement: new Date().toISOString() } 
          : item
      ));

      toast.dismiss(toastId);
      toast.success(`Inscription validée ! ${athletePayload.nom} ${athletePayload.prenom} a été ajouté aux athlètes.`);
      return newAthlete;
    } catch (err) {
      toast.dismiss(toastId);
      console.error('Erreur validation inscription:', err);
      toast.error('Erreur lors de la validation : ' + err.message);
      return null;
    }
  };

  // Rejeter une inscription avec motif
  const rejeterInscription = async (inscriptionId, motifRejet) => {
    const toastId = toast.loading('Enregistrement du rejet...');
    try {
      const { error } = await supabase
        .from('inscriptions')
        .update({
          statut: 'REJETE',
          motif_rejet: motifRejet || 'Dossier non conforme',
          date_traitement: new Date().toISOString()
        })
        .eq('id', inscriptionId);

      if (error) throw error;

      setInscriptions(prev => prev.map(item => 
        item.id === inscriptionId 
          ? { ...item, statut: 'REJETE', motif_rejet: motifRejet, date_traitement: new Date().toISOString() } 
          : item
      ));

      toast.dismiss(toastId);
      toast.success('Demande d\'inscription rejetée.');
      return true;
    } catch (err) {
      toast.dismiss(toastId);
      console.error('Erreur rejet inscription:', err);
      toast.error('Erreur lors du rejet : ' + err.message);
      return false;
    }
  };

  // Supprimer une inscription
  const deleteInscription = async (inscriptionId) => {
    try {
      const { error } = await supabase
        .from('inscriptions')
        .delete()
        .eq('id', inscriptionId);

      if (error) throw error;

      setInscriptions(prev => prev.filter(item => item.id !== inscriptionId));
      toast.success('Dossier supprimé.');
      return true;
    } catch (err) {
      console.error('Erreur suppression:', err);
      toast.error('Erreur lors de la suppression');
      return false;
    }
  };

  return {
    inscriptions,
    loading,
    error,
    pendingCount,
    fetchInscriptions,
    validerInscription,
    rejeterInscription,
    deleteInscription
  };
}
