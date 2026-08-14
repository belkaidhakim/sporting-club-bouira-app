import React, { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  CheckCircle, 
  XCircle, 
  Eye, 
  FileText, 
  Clock, 
  HeartPulse, 
  ShieldCheck, 
  Camera, 
  Phone, 
  Calendar, 
  Trash2, 
  Copy, 
  ExternalLink,
  Printer,
  X,
  AlertTriangle
} from 'lucide-react';
import { Card, Button, Skeleton } from '../components/ui';
import { useInscriptions } from '../hooks/useInscriptions';
import BadgeGenerator from '../components/BadgeGenerator';

export default function PendingInscriptions() {
  const { 
    inscriptions, 
    loading, 
    fetchInscriptions, 
    validerInscription, 
    rejeterInscription, 
    deleteInscription 
  } = useInscriptions();

  const [activeTab, setActiveTab] = useState('EN_ATTENTE'); // 'EN_ATTENTE', 'VALIDE', 'REJETE', 'ALL'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected inscription for modal view
  const [selectedInscription, setSelectedInscription] = useState(null);
  
  // Rejection modal state
  const [rejectionModal, setRejectionModal] = useState({
    isOpen: false,
    inscriptionId: null,
    athleteName: '',
    motif: ''
  });

  // Badge preview modal for newly validated athlete
  const [validatedAthleteBadge, setValidatedAthleteBadge] = useState(null);

  // Document zoom / viewer modal
  const [documentViewer, setDocumentViewer] = useState({
    isOpen: false,
    title: '',
    src: null
  });

  useEffect(() => {
    fetchInscriptions();
  }, [fetchInscriptions]);

  // Statistiques
  const stats = useMemo(() => {
    const pending = inscriptions.filter(i => i.statut === 'EN_ATTENTE').length;
    const validated = inscriptions.filter(i => i.statut === 'VALIDE').length;
    const rejected = inscriptions.filter(i => i.statut === 'REJETE').length;
    return { pending, validated, rejected, total: inscriptions.length };
  }, [inscriptions]);

  // Filtrage et recherche
  const filteredInscriptions = useMemo(() => {
    return inscriptions.filter(item => {
      // Filtre statut
      if (activeTab !== 'ALL' && item.statut !== activeTab) {
        return false;
      }
      // Filtre recherche
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nom = (item.nom || '').toLowerCase();
        const prenom = (item.prenom || '').toLowerCase();
        const dossier = (item.numero_dossier || '').toLowerCase();
        const tel = (item.telephone || '').toLowerCase();
        const groupe = (item.groupes?.nom || item.groupe_nom || '').toLowerCase();
        return nom.includes(q) || prenom.includes(q) || dossier.includes(q) || tel.includes(q) || groupe.includes(q);
      }
      return true;
    });
  }, [inscriptions, activeTab, searchQuery]);

  // Copier le lien d'inscription publique
  const copyPublicLink = () => {
    const publicUrl = `${window.location.origin}/inscription`;
    navigator.clipboard.writeText(publicUrl);
    toast.success('Lien public copié dans le presse-papiers !');
  };

  // Traiter la validation
  const handleValidate = async (inscription) => {
    const newAthlete = await validerInscription(inscription);
    if (newAthlete) {
      if (selectedInscription && selectedInscription.id === inscription.id) {
        setSelectedInscription(null);
      }
      // Proposer l'aperçu du badge
      setValidatedAthleteBadge(newAthlete);
    }
  };

  // Ouvrir modale de rejet
  const openRejectionModal = (inscription) => {
    setRejectionModal({
      isOpen: true,
      inscriptionId: inscription.id,
      athleteName: `${inscription.nom?.toUpperCase()} ${inscription.prenom}`,
      motif: 'Certificat médical non conforme ou illisible'
    });
  };

  // Confirmer le rejet
  const handleConfirmRejection = async () => {
    if (!rejectionModal.motif.trim()) {
      toast.error('Veuillez indiquer un motif de rejet.');
      return;
    }
    const success = await rejeterInscription(rejectionModal.inscriptionId, rejectionModal.motif);
    if (success) {
      setRejectionModal({ isOpen: false, inscriptionId: null, athleteName: '', motif: '' });
      if (selectedInscription && selectedInscription.id === rejectionModal.inscriptionId) {
        setSelectedInscription(null);
      }
    }
  };

  return (
    <div>
      {/* HEADER DE LA PAGE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1>Inscriptions en Attente</h1>
          <p>Examinez les dossiers d'adhésion en ligne, vérifiez les pièces justificatives et intégrez les nouveaux membres.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="secondary" 
            onClick={copyPublicLink}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Copier le lien du formulaire public à partager aux athlètes"
          >
            <Copy size={16} /> Copier le lien d'inscription
          </Button>
          <Button 
            variant="primary" 
            onClick={() => window.open('/inscription', '_blank')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Ouvrir la page publique d'inscription dans un nouvel onglet"
          >
            <ExternalLink size={16} /> Formulaire Public
          </Button>
        </div>
      </div>

      {/* STATS RAPIDES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4" style={{ borderLeft: '4px solid #f59e0b' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>En attente</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{stats.pending}</div>
        </Card>
        <Card className="p-4" style={{ borderLeft: '4px solid #10b981' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Validées</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-success)' }}>{stats.validated}</div>
        </Card>
        <Card className="p-4" style={{ borderLeft: '4px solid #ef4444' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Rejetées</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-danger)' }}>{stats.rejected}</div>
        </Card>
        <Card className="p-4" style={{ borderLeft: '4px solid #6366f1' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Dossiers</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#818cf8' }}>{stats.total}</div>
        </Card>
      </div>

      {/* ONGLETS & RECHERCHE */}
      <Card className="mb-6">
        <div className="p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-[rgba(255,255,255,0.06)]">
          {/* Tabs */}
          <div className="flex gap-2">
            <button 
              className={`tab-btn ${activeTab === 'EN_ATTENTE' ? 'active' : ''}`}
              onClick={() => setActiveTab('EN_ATTENTE')}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', backgroundColor: activeTab === 'EN_ATTENTE' ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)', color: activeTab === 'EN_ATTENTE' ? '#fff' : 'var(--text-muted)' }}
            >
              En attente ({stats.pending})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'VALIDE' ? 'active' : ''}`}
              onClick={() => setActiveTab('VALIDE')}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', backgroundColor: activeTab === 'VALIDE' ? 'var(--accent-success)' : 'rgba(255,255,255,0.05)', color: activeTab === 'VALIDE' ? '#fff' : 'var(--text-muted)' }}
            >
              Validées ({stats.validated})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'REJETE' ? 'active' : ''}`}
              onClick={() => setActiveTab('REJETE')}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', backgroundColor: activeTab === 'REJETE' ? 'var(--accent-danger)' : 'rgba(255,255,255,0.05)', color: activeTab === 'REJETE' ? '#fff' : 'var(--text-muted)' }}
            >
              Rejetées ({stats.rejected})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
              onClick={() => setActiveTab('ALL')}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', backgroundColor: activeTab === 'ALL' ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', color: activeTab === 'ALL' ? '#fff' : 'var(--text-muted)' }}
            >
              Toutes ({stats.total})
            </button>
          </div>

          {/* Recherche */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Rechercher par nom, dossier..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '36px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* LISTE DES DOSSIERS */}
        {loading ? (
          <div className="p-8 flex flex-col gap-4">
            <Skeleton height="50px" />
            <Skeleton height="50px" />
            <Skeleton height="50px" />
          </div>
        ) : filteredInscriptions.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Aucun dossier d'inscription trouvé.</p>
            <span style={{ fontSize: '0.85rem' }}>Les nouvelles pré-inscriptions publiques apparaîtront automatiquement ici.</span>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="w-full text-left border-collapse" style={{ minWidth: '850px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th className="p-4">Dossier</th>
                  <th className="p-4">Candidat</th>
                  <th className="p-4">Section / Groupe</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Pièces Jointes</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInscriptions.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Dossier & Date */}
                    <td className="p-4">
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                        {item.numero_dossier}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(item.date_demande).toLocaleDateString('fr-FR')}
                      </div>
                    </td>

                    {/* Candidat */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {item.photo ? (
                            <img src={item.photo} alt={item.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <Camera size={18} color="var(--text-muted)" />
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                            {item.nom?.toUpperCase()} {item.prenom}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.date_naissance ? `${new Date(item.date_naissance).toLocaleDateString('fr-FR')} (${item.sexe})` : item.sexe}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Section */}
                    <td className="p-4 font-medium" style={{ fontSize: '0.85rem' }}>
                      {item.groupes?.nom || item.groupe_nom || <span className="text-muted">Non spécifié</span>}
                    </td>

                    {/* Contact */}
                    <td className="p-4">
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                        {item.telephone}
                      </div>
                      {item.telephone_parent && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Parent : {item.telephone_parent}
                        </div>
                      )}
                    </td>

                    {/* Pièces Jointes */}
                    <td className="p-4">
                      <div className="flex gap-2">
                        <span 
                          title={item.photo ? "Photo fournie" : "Photo manquante"}
                          style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: item.photo ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.05)', color: item.photo ? '#818cf8' : 'var(--text-muted)' }}
                        >
                          Photo {item.photo ? '✔' : '✖'}
                        </span>
                        <span 
                          title={item.certificat_medical ? "Certificat médical fourni" : "Certificat médical manquant"}
                          style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: item.certificat_medical ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', color: item.certificat_medical ? '#10b981' : 'var(--text-muted)' }}
                        >
                          Médical {item.certificat_medical ? '✔' : '✖'}
                        </span>
                        {item.autorisation_parentale && (
                          <span 
                            title="Autorisation parentale fournie"
                            style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}
                          >
                            Parent ✔
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Statut */}
                    <td className="p-4">
                      {item.statut === 'EN_ATTENTE' && (
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                          En Attente
                        </span>
                      )}
                      {item.statut === 'VALIDE' && (
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)' }}>
                          Validée
                        </span>
                      )}
                      {item.statut === 'REJETE' && (
                        <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-danger)' }}>
                          Rejetée
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="secondary" 
                          style={{ padding: '0.4rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setSelectedInscription(item)}
                          title="Examiner le dossier complet"
                        >
                          <Eye size={15} /> Examiner
                        </Button>
                        
                        {item.statut === 'EN_ATTENTE' && (
                          <>
                            <Button 
                              variant="primary" 
                              style={{ padding: '0.4rem 0.75rem', backgroundColor: 'var(--accent-success)', borderColor: 'var(--accent-success)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => handleValidate(item)}
                              title="Valider et intégrer directement aux athlètes"
                            >
                              <CheckCircle size={15} /> Valider
                            </Button>
                            <Button 
                              variant="secondary" 
                              style={{ padding: '0.4rem 0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.25)' }}
                              onClick={() => openRejectionModal(item)}
                              title="Rejeter le dossier"
                            >
                              <XCircle size={15} />
                            </Button>
                          </>
                        )}

                        <Button 
                          variant="secondary" 
                          style={{ padding: '0.4rem 0.75rem', color: 'var(--text-muted)' }}
                          onClick={() => {
                            if (window.confirm("Supprimer définitivement cette demande d'inscription ?")) {
                              deleteInscription(item.id);
                            }
                          }}
                          title="Supprimer la demande"
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* MODALE D'EXAMEN DÉTAILLÉ DU DOSSIER */}
      {selectedInscription && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(5px)'
        }}>
          <div className="glass-panel" style={{
            width: '850px',
            maxWidth: '96vw',
            maxHeight: '94vh',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: '16px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-[rgba(255,255,255,0.1)]" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <div className="flex items-center gap-3">
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Dossier d'Inscription : {selectedInscription.numero_dossier}
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Déposé le {new Date(selectedInscription.date_demande).toLocaleDateString('fr-FR')} à {new Date(selectedInscription.date_demande).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedInscription(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6" style={{ overflowY: 'auto', flex: 1 }}>
              {/* Profil & Coordonnées */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Photo de profil */}
                <div className="text-center">
                  <div style={{ width: '130px', height: '160px', borderRadius: '12px', overflow: 'hidden', margin: '0 auto 8px', border: '2px solid rgba(99, 102, 241, 0.4)', backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selectedInscription.photo ? (
                      <img src={selectedInscription.photo} alt="Photo profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div className="text-muted text-xs p-2">Aucune photo fournie</div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Photo d'identité (Badge)</span>
                </div>

                {/* Données personnelles */}
                <div className="md:col-span-2 flex flex-col justify-between">
                  <div>
                    <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {selectedInscription.nom?.toUpperCase()} {selectedInscription.prenom}
                    </h2>
                    <span style={{ fontSize: '0.85rem', color: 'var(--accent-secondary)', fontWeight: 600 }}>
                      Section : {selectedInscription.groupes?.nom || selectedInscription.groupe_nom || 'Non spécifié'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4 text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                    <div>
                      <span className="text-muted block text-xs">Date de Naissance :</span>
                      <strong>{selectedInscription.date_naissance ? new Date(selectedInscription.date_naissance).toLocaleDateString('fr-FR') : '-'} ({selectedInscription.sexe})</strong>
                    </div>
                    <div>
                      <span className="text-muted block text-xs">Téléphone :</span>
                      <strong>{selectedInscription.telephone}</strong>
                    </div>
                    <div>
                      <span className="text-muted block text-xs">Contact Parent / Tuteur :</span>
                      <strong>{selectedInscription.telephone_parent || 'Non renseigné'}</strong>
                    </div>
                    <div>
                      <span className="text-muted block text-xs">Adresse :</span>
                      <span>{selectedInscription.adresse || 'Non renseignée'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pièces Justificatives */}
              <div className="mb-6">
                <h4 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Documents Justificatifs Joints
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Certificat Médical */}
                  <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-sm flex items-center gap-2">
                        <HeartPulse size={16} color="#10b981" /> Certificat Médical
                      </span>
                      {selectedInscription.certificat_medical ? (
                        <Button 
                          variant="secondary" 
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => setDocumentViewer({ isOpen: true, title: 'Certificat Médical', src: selectedInscription.certificat_medical })}
                        >
                          <Eye size={13} /> Visualiser
                        </Button>
                      ) : (
                        <span className="text-danger text-xs font-semibold">Non fourni</span>
                      )}
                    </div>
                    <span className="text-xs text-muted block">
                      {selectedInscription.certificat_medical ? 'Document téléversé par l\'adhérent' : 'À exiger lors de la remise du badge physique'}
                    </span>
                  </div>

                  {/* Autorisation Parentale */}
                  <div style={{ padding: '14px', borderRadius: '10px', backgroundColor: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-sm flex items-center gap-2">
                        <ShieldCheck size={16} color="#f59e0b" /> Autorisation Parentale
                      </span>
                      {selectedInscription.autorisation_parentale ? (
                        <Button 
                          variant="secondary" 
                          style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => setDocumentViewer({ isOpen: true, title: 'Autorisation Parentale', src: selectedInscription.autorisation_parentale })}
                        >
                          <Eye size={13} /> Visualiser
                        </Button>
                      ) : (
                        <span className="text-muted text-xs">Non requise / Non fournie</span>
                      )}
                    </div>
                    <span className="text-xs text-muted block">
                      {selectedInscription.autorisation_parentale ? 'Document d\'autorisation disponible' : 'Pour les athlètes mineurs'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Remarques médicales & Loi 18-07 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <span className="text-muted block text-xs mb-1 font-semibold">Observations Médicales :</span>
                  <span className="text-sm">{selectedInscription.observations_medicales || 'Aucune observation signalée.'}</span>
                </div>
                <div style={{ padding: '12px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <span className="text-success block text-xs mb-1 font-semibold">Conformité Loi 18-07 :</span>
                  <span className="text-xs text-slate-300">✔ Consentement explicite au traitement des données & acceptation du règlement intérieur validés.</span>
                </div>
              </div>

              {/* Motif de rejet si rejeté */}
              {selectedInscription.statut === 'REJETE' && selectedInscription.motif_rejet && (
                <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                  <span className="text-danger font-semibold text-xs block mb-1">Motif du rejet :</span>
                  <span className="text-sm text-red-200">{selectedInscription.motif_rejet}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 flex justify-between items-center border-t border-[rgba(255,255,255,0.1)]" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
              <Button variant="secondary" onClick={() => setSelectedInscription(null)}>
                Fermer
              </Button>

              {selectedInscription.statut === 'EN_ATTENTE' && (
                <div className="flex gap-3">
                  <Button 
                    variant="secondary" 
                    style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.25)' }}
                    onClick={() => openRejectionModal(selectedInscription)}
                  >
                    <XCircle size={16} /> Rejeter
                  </Button>
                  <Button 
                    variant="primary" 
                    style={{ backgroundColor: 'var(--accent-success)', borderColor: 'var(--accent-success)' }}
                    onClick={() => handleValidate(selectedInscription)}
                  >
                    <CheckCircle size={16} /> Valider l'inscription
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SAISIE DU MOTIF DE REJET */}
      {rejectionModal.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 110,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(5px)'
        }}>
          <Card style={{ width: '500px', maxWidth: '96vw', border: '1px solid rgba(239, 68, 68, 0.4)' }} className="p-6">
            <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={20} /> Rejeter la demande d'inscription
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Candidat : <strong>{rejectionModal.athleteName}</strong>
            </p>

            <div className="mb-4">
              <label className="form-label text-sm font-semibold">Motif du rejet (Explication pour le secrétariat) :</label>
              <textarea 
                rows={3} 
                value={rejectionModal.motif}
                onChange={(e) => setRejectionModal(prev => ({ ...prev, motif: e.target.value }))}
                className="form-input"
                placeholder="Indiquez pourquoi ce dossier ne peut pas être accepté (ex: Certificat médical illisible, Pièce manquante...)"
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="secondary" 
                onClick={() => setRejectionModal({ isOpen: false, inscriptionId: null, athleteName: '', motif: '' })}
              >
                Annuler
              </Button>
              <Button 
                variant="primary" 
                style={{ backgroundColor: 'var(--accent-danger)', borderColor: 'var(--accent-danger)' }}
                onClick={handleConfirmRejection}
              >
                Confirmer le rejet
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* VISIONNEUSE DE DOCUMENT (CERTIFICAT / AUTORISATION) */}
      {documentViewer.isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          zIndex: 120,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="flex justify-between items-center w-full max-w-4xl mb-3 text-white">
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{documentViewer.title}</h3>
            <button 
              onClick={() => setDocumentViewer({ isOpen: false, title: '', src: null })}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '6px' }}
            >
              <X size={26} />
            </button>
          </div>

          <div style={{ maxWidth: '90vw', maxHeight: '80vh', overflow: 'auto', backgroundColor: '#1e293b', borderRadius: '12px', padding: '10px', boxShadow: '0 20px 40px rgba(0,0,0,0.8)' }}>
            {documentViewer.src?.startsWith('data:application/pdf') ? (
              <iframe src={documentViewer.src} title="Document PDF" style={{ width: '800px', height: '70vh', border: 'none', maxWidth: '85vw' }} />
            ) : (
              <img src={documentViewer.src} alt={documentViewer.title} style={{ maxWidth: '100%', maxHeight: '78vh', objectFit: 'contain', borderRadius: '8px' }} />
            )}
          </div>
        </div>
      )}

      {/* MODALE D'APERÇU DU BADGE QR APRÈS VALIDATION */}
      {validatedAthleteBadge && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          zIndex: 130,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(6px)'
        }}>
          <Card className="p-6 text-center" style={{ maxWidth: '560px', width: '100%', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <CheckCircle size={32} />
            </div>
            <h3 style={{ margin: '0 0 4px', fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>
              Athlète Validé & Carte Créée !
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              {validatedAthleteBadge.nom?.toUpperCase()} {validatedAthleteBadge.prenom} a été intégré. Voici son Badge QR officiel prêt à être imprimé.
            </p>

            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              <BadgeGenerator athlete={validatedAthleteBadge} showEndDate={false} />
            </div>

            <div className="flex justify-center gap-3">
              <Button variant="secondary" onClick={() => setValidatedAthleteBadge(null)}>
                Fermer
              </Button>
              <Button 
                variant="primary" 
                onClick={() => window.print()}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Printer size={16} /> Imprimer le Badge
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
