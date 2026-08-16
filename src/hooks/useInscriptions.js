import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export function useInscriptions() {
  const [inscriptions, setInscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTableMissing, setIsTableMissing] = useState(false);

  const getLocalBackups = () => {
    try {
      const stored = localStorage.getItem('local_inscriptions_backup');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const fetchInscriptions = useCallback(async () => {
    try {
      setLoading(true);
      const localItems = getLocalBackups();
      
      const { data, error } = await supabase
        .from('inscriptions')
        .select(`
          *,
          groupes (id, nom)
        `)
        .order('date_demande', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation "public.inscriptions" does not exist') || error.message?.includes('not found')) {
          console.warn('Table inscriptions non encore créée dans Supabase.');
          setIsTableMissing(true);
          setInscriptions(localItems);
          return;
        }
        throw error;
      }
      
      setIsTableMissing(false);
      // Merge remote and any un-synced local items (deduplicate by numero_dossier)
      const remoteMap = new Set((data || []).map(d => d.numero_dossier));
      const unSyncedLocals = localItems.filter(l => !remoteMap.has(l.numero_dossier));
      setInscriptions([...unSyncedLocals, ...(data || [])]);
      setError(null);
    } catch (err) {
      console.error('Erreur fetchInscriptions:', err);
      setError(err.message);
      setInscriptions(getLocalBackups());
    } finally {
      setLoading(false);
    }
  }, []);

  // Compteur de demandes en attente
  const pendingCount = inscriptions.filter(i => i.statut === 'EN_ATTENTE').length;

  // Insertion sécurisée d'un athlète avec repli si certaines colonnes n'existent pas dans Supabase
  const insertAthleteSafely = async (payload) => {
    let toInsert = { ...payload };
    let { data, error } = await supabase.from('athletes').insert([toInsert]).select().maybeSingle();

    if (error && (error.message?.includes('column') || error.message?.includes('schema cache') || error.code === '42703')) {
      console.warn('Colonnes étendues non trouvées dans athletes, repli sur le schéma standard:', error.message);
      delete toInsert.contact_urgence;
      delete toInsert.observations_medicales;
      delete toInsert.groupe_id;

      let retry = await supabase.from('athletes').insert([toInsert]).select().maybeSingle();
      if (retry.error && retry.error.message?.includes('column')) {
        delete toInsert.groupe;
        retry = await supabase.from('athletes').insert([toInsert]).select().maybeSingle();
      }
      return retry;
    }

    return { data, error };
  };

  // Valider une inscription et créer l'athlète correspondant
  const validerInscription = async (inscription, paymentOptions = null) => {
    const toastId = toast.loading("Validation et intégration de l'athlète...");
    try {
      // 1. Générer token QR unique
      const token_qr = `SCB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // 2. Préparer le payload athlète
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

      // Insertion résiliente
      const { data: newAthlete, error: athleteError } = await insertAthleteSafely(athletePayload);

      if (athleteError) throw athleteError;

      const createdAthlete = newAthlete || { ...athletePayload, id: `ath-${Date.now()}` };

      // 3. Si paiement enregistré lors de la validation
      if (paymentOptions && paymentOptions.isPaid) {
        try {
          const endDate = paymentOptions.periodeFin || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          if (createdAthlete.id && !createdAthlete.id.toString().startsWith('ath-')) {
            await supabase.from('cotisations').insert([{
              athlete_id: createdAthlete.id,
              montant_paye: Number(paymentOptions.montant) || 3000,
              mode_paiement: paymentOptions.modePaiement || 'Espèces',
              periode_couverte_fin: endDate
            }]);

            await supabase.from('cartes_acces').upsert([{
              athlete_id: createdAthlete.id,
              statut: 'ACTIVE',
              date_dernier_paiement: new Date().toISOString()
            }]);
          }
        } catch (payErr) {
          console.warn('Erreur enregistrement paiement automatique:', payErr);
        }
      }

      // 4. Mettre à jour le statut dans inscriptions
      try {
        const { error: updateError } = await supabase
          .from('inscriptions')
          .update({
            statut: 'VALIDE',
            date_traitement: new Date().toISOString()
          })
          .eq('id', inscription.id);

        if (updateError) console.warn('Warning mise à jour statut inscription:', updateError);
      } catch (e) {
        console.warn('Supabase update warning:', e);
      }

      // Mettre à jour le stockage local si présent
      try {
        const stored = localStorage.getItem('local_inscriptions_backup');
        if (stored) {
          const list = JSON.parse(stored).map(item => 
            item.id === inscription.id || item.numero_dossier === inscription.numero_dossier 
              ? { ...item, statut: 'VALIDE', date_traitement: new Date().toISOString() } 
              : item
          );
          localStorage.setItem('local_inscriptions_backup', JSON.stringify(list));
        }
      } catch (e) {
        console.warn('Local update error:', e);
      }

      // 5. Mettre à jour l'état local
      setInscriptions(prev => prev.map(item => 
        item.id === inscription.id 
          ? { ...item, statut: 'VALIDE', date_traitement: new Date().toISOString() } 
          : item
      ));

      toast.dismiss(toastId);
      toast.success(`Inscription validée ! ${athletePayload.nom} ${athletePayload.prenom} a été ajouté aux athlètes.`);
      return { ...createdAthlete, cotisations: paymentOptions?.isPaid ? [{ periode_couverte_fin: paymentOptions.periodeFin }] : [] };
    } catch (err) {
      toast.dismiss(toastId);
      console.error('Erreur validation inscription:', err);
      toast.error('Erreur lors de la validation : ' + (err.message || 'Erreur inconnue'));
      return null;
    }
  };

  // Validation en masse
  const validerMultipleInscriptions = async (inscriptionsList) => {
    if (!inscriptionsList || inscriptionsList.length === 0) return 0;
    const toastId = toast.loading(`Validation de ${inscriptionsList.length} dossier(s) en cours...`);
    let validatedCount = 0;

    for (const item of inscriptionsList) {
      try {
        const token_qr = `SCB-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const athletePayload = {
          nom: (item.nom || '').trim().toUpperCase(),
          prenom: (item.prenom || '').trim(),
          date_naissance: item.date_naissance || null,
          sexe: item.sexe || null,
          telephone: item.telephone || null,
          contact_urgence: item.telephone_parent || null,
          observations_medicales: item.observations_medicales || null,
          groupe_id: item.groupe_id || null,
          groupe: item.groupes?.nom || item.groupe_nom || null,
          certificat_medical_valide: true,
          photo: item.photo || null,
          token_qr: token_qr,
          est_actif: true
        };

        const { error: insErr } = await insertAthleteSafely(athletePayload);
        if (!insErr) {
          try {
            await supabase.from('inscriptions').update({ statut: 'VALIDE', date_traitement: new Date().toISOString() }).eq('id', item.id);
          } catch {
            // ignore
          }
          validatedCount++;
        }
      } catch (err) {
        console.warn('Erreur validation item en lot:', err);
      }
    }

    fetchInscriptions();
    toast.dismiss(toastId);
    toast.success(`${validatedCount} dossier(s) validé(s) et intégrés avec succès !`);
    return validatedCount;
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
    isTableMissing,
    fetchInscriptions,
    validerInscription,
    validerMultipleInscriptions,
    rejeterInscription,
    deleteInscription
  };
}
