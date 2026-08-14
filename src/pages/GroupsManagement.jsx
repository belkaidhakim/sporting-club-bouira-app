import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Card, Button, Skeleton } from '../components/ui';
import { Users, Edit2, Plus, CalendarDays, Clock, Trash2, AlertTriangle, ScanLine } from 'lucide-react';
import toast from 'react-hot-toast';

const parseHoraires = (horairesText) => {
  if (!horairesText) return [];
  try {
    const parsed = JSON.parse(horairesText);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
};

const getTrainerDisplayName = (profile) => {
  if (!profile) return { name: 'Non assigné', initial: '?' };
  if (profile.nom && profile.prenom) {
    return { 
      name: `${profile.prenom} ${profile.nom}`, 
      initial: `${profile.prenom[0]}${profile.nom[0]}`.toUpperCase() 
    };
  }
  if (profile.email) {
    const username = profile.email.split('@')[0];
    const words = username
      .replace(/[._\d]+/g, ' ')
      .trim()
      .split(/\s+/);

    const formatted = words
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    let initial = 'E';
    if (words.length >= 2) {
      initial = (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
    } else if (words.length === 1 && words[0].length > 0) {
      initial = words[0].charAt(0).toUpperCase();
    }

    return { name: formatted || profile.email, initial };
  }
  return { name: 'Entraîneur', initial: 'E' };
};

const JOURS_SEMAINE = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function GroupsManagement() {
  const [groupes, setGroupes] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    nom: '',
    capacite_max: 20,
    entraineur_id: ''
  });
  
  // State structuré du planning
  const [planning, setPlanning] = useState([]);
  const [selectedJour, setSelectedJour] = useState('Dimanche');
  const [selectedHeure, setSelectedHeure] = useState('10:00');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      
      const { data: groupesData, error: gError } = await supabase
        .from('groupes')
        .select(`*, profiles:entraineur_id (id, email), athletes (id)`)
        .order('nom');

      if (gError) throw gError;

      const { data: trainersData, error: tError } = await supabase
        .from('profiles')
        .select('id, email, role');

      if (tError) console.error("Error fetching trainers:", tError);

      setGroupes(groupesData || []);
      setTrainers(trainersData || []);
    } catch (error) {
      console.error('Error fetching groups data:', error);
      toast.error('Erreur lors du chargement des groupes: ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  }

  const handleOpenModal = (groupe = null) => {
    if (groupe) {
      setEditingGroup(groupe);
      setFormData({
        nom: groupe.nom || '',
        capacite_max: groupe.capacite_max || 20,
        entraineur_id: groupe.entraineur_id || ''
      });
      setPlanning(parseHoraires(groupe.horaires));
    } else {
      setEditingGroup(null);
      setFormData({
        nom: '',
        capacite_max: 20,
        entraineur_id: ''
      });
      setPlanning([]);
    }
    setIsModalOpen(true);
  };

  const addSeance = () => {
    if (!selectedJour || !selectedHeure) return;
    const exists = planning.some(s => s.jour === selectedJour && s.heure === selectedHeure);
    if (exists) {
      toast.error("Ce créneau existe déjà dans le planning");
      return;
    }
    setPlanning([...planning, { jour: selectedJour, heure: selectedHeure }]);
  };

  const removeSeance = (index) => {
    setPlanning(planning.filter((_, i) => i !== index));
  };

  const handleDeleteGroup = async (groupe) => {
    const inscrits = groupe.athletes ? groupe.athletes.length : 0;
    if (inscrits > 0) {
      const confirmDelete = window.confirm(
        `Ce groupe contient actuellement ${inscrits} athlète(s).\nSi vous le supprimez, ces athlètes ne seront plus assignés à ce groupe.\nVoulez-vous continuer ?`
      );
      if (!confirmDelete) return;
    } else {
      if (!window.confirm(`Voulez-vous vraiment supprimer le groupe "${groupe.nom}" ?`)) return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('groupes').delete().eq('id', groupe.id);
      if (error) throw error;
      toast.success(`Groupe "${groupe.nom}" supprimé avec succès`);
      fetchData();
    } catch (err) {
      console.error("Erreur suppression groupe:", err);
      toast.error("Erreur lors de la suppression : " + err.message);
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nom: formData.nom,
        capacite_max: parseInt(formData.capacite_max, 10),
        entraineur_id: formData.entraineur_id || null,
        horaires: JSON.stringify(planning)
      };

      if (editingGroup) {
        const { error } = await supabase
          .from('groupes')
          .update(payload)
          .eq('id', editingGroup.id);
        if (error) throw error;
        toast.success('Groupe mis à jour');
      } else {
        const { error } = await supabase
          .from('groupes')
          .insert([payload]);
        if (error) throw error;
        toast.success('Groupe créé');
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error('Erreur lors de l\'enregistrement du groupe');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1>Gestion des Groupes</h1>
          <p style={{ marginBottom: 0 }}>Configurez les catégories, entraîneurs et les créneaux d'entraînement.</p>
        </div>
        <Button variant="primary" onClick={() => handleOpenModal()}>
          <Plus size={16} /> Nouveau Groupe
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton height="270px" />
          <Skeleton height="270px" />
          <Skeleton height="270px" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {groupes.map(groupe => {
            const inscrits = groupe.athletes ? groupe.athletes.length : 0;
            const capacite = groupe.capacite_max || 20;
            const percentage = Math.min(100, Math.round((inscrits / capacite) * 100));
            const planningData = parseHoraires(groupe.horaires);
            const trainerInfo = getTrainerDisplayName(groupe.profiles);
            const hasTrainer = Boolean(groupe.profiles);

            // Code couleur dynamique de remplissage
            let progressColor = '#10b981'; // Vert < 50%
            let statusBadgeText = 'Places disponibles';
            
            if (percentage >= 100) {
              progressColor = '#ef4444'; // Rouge >= 100%
              statusBadgeText = 'Groupe complet';
            } else if (percentage >= 80) {
              progressColor = '#f59e0b'; // Orange >= 80% (ex: 16/20)
              statusBadgeText = 'Quasiment complet';
            } else if (percentage >= 50) {
              progressColor = '#3b82f6'; // Bleu >= 50%
              statusBadgeText = 'Remplissage régulier';
            }

            return (
              <Card 
                key={groupe.id} 
                style={{ 
                  padding: '1.5rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justify: 'space-between',
                  height: '100%',
                  minHeight: '270px'
                }}
              >
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {/* Entête Carte avec Actions Rapides */}
                    <div className="flex flex-wrap justify-between items-start mb-4 gap-2">
                      <div>
                        <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>{groupe.nom}</h2>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Link to={`/athletes?search=${encodeURIComponent(groupe.nom)}`} style={{ textDecoration: 'none' }}>
                          <button 
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '5px',
                              padding: '5px 11px', 
                              borderRadius: 'var(--radius-full)', 
                              backgroundColor: 'rgba(99, 102, 241, 0.12)', 
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              color: 'var(--accent-primary-hover)',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            title="Voir les membres de ce groupe"
                          >
                            <Users size={12} />
                            Voir la liste ({inscrits})
                          </button>
                        </Link>

                        <button 
                          onClick={() => handleOpenModal(groupe)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                          title="Modifier le groupe"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button 
                          onClick={() => handleDeleteGroup(groupe)}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: '4px' }}
                          title="Supprimer le groupe"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-3 mb-4">
                      {/* Entraîneur : Alerte douce si Non assigné, sinon Avatar + Nom */}
                      {!hasTrainer ? (
                        <div className="flex items-center gap-2 text-sm">
                          <div style={{
                            padding: '4px 10px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <AlertTriangle size={13} />
                            Entraîneur non assigné
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                          <div style={{
                            width: '26px',
                            height: '26px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: 'var(--accent-primary)',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid rgba(99, 102, 241, 0.3)',
                            flexShrink: 0
                          }}>
                            {trainerInfo.initial}
                          </div>
                          <span>Entraîneur: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{trainerInfo.name}</strong></span>
                        </div>
                      )}
                      
                      {/* Planning affiché sous forme de pilules */}
                      <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <CalendarDays size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '4px' }} />
                        <div>
                          {planningData.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {planningData.map((s, i) => (
                                <span key={i} style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 10px',
                                  borderRadius: 'var(--radius-full)',
                                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                  color: 'var(--accent-primary-hover)',
                                  border: '1px solid rgba(99, 102, 241, 0.2)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  fontFamily: 'Outfit'
                                }}>
                                  <Clock size={11} />
                                  {s.jour} {s.heure}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pas de planning défini</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Remplissage Dynamique avec Code Couleur */}
                  <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Users size={14} /> Remplissage
                      </span>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: progressColor }}>
                          {percentage}%
                        </span>
                        <span style={{ fontWeight: 'bold' }}>{inscrits} / {capacite}</span>
                      </div>
                    </div>
                    
                    <div style={{ width: '100%', height: '7px', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${percentage}%`, 
                          backgroundColor: progressColor,
                          borderRadius: '4px',
                          transition: 'width 0.5s ease-out',
                          boxShadow: `0 0 8px ${progressColor}50`
                        }} 
                      />
                    </div>

                    <div className="flex justify-between items-center mt-2" style={{ fontSize: '0.75rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Capacité: {capacite} athlètes</span>
                      <span style={{ color: progressColor, fontWeight: 700 }}>
                        {statusBadgeText}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-2 pt-2" style={{ fontSize: '0.75rem', borderTop: '1px dashed var(--border-color)' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Pointage d'entraînement</span>
                      <Link to="/scanner" target="_blank" style={{ textDecoration: 'none' }}>
                        <span style={{ 
                          color: 'var(--accent-secondary)', 
                          fontWeight: 600, 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '4px',
                          cursor: 'pointer'
                        }}>
                          <ScanLine size={12} /> Faire l'appel (Scanner) →
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Edition / Création */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <Card style={{ width: '100%', maxWidth: '520px', margin: '1rem' }}>
            <h2 className="mb-4">{editingGroup ? 'Modifier le Groupe' : 'Nouveau Groupe'}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Nom du Groupe *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  required 
                  value={formData.nom}
                  onChange={e => setFormData({...formData, nom: e.target.value})}
                  placeholder="Ex: Poussins, Elite..."
                />
              </div>
              <div className="form-group">
                <label className="form-label">Capacité Maximum</label>
                <input 
                  type="number" 
                  className="form-input" 
                  required 
                  min="1"
                  value={formData.capacite_max}
                  onChange={e => setFormData({...formData, capacite_max: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Entraîneur Assigné</label>
                <select 
                  className="form-select"
                  value={formData.entraineur_id}
                  onChange={e => setFormData({...formData, entraineur_id: e.target.value})}
                >
                  <option value="">-- Aucun entraîneur assigné --</option>
                  {trainers.map(t => {
                    const info = getTrainerDisplayName(t);
                    return (
                      <option key={t.id} value={t.id}>{info.name} ({t.email})</option>
                    );
                  })}
                </select>
              </div>

              {/* Planning d'entraînement */}
              <div className="form-group">
                <label className="form-label">Planning d'Entraînement</label>
                
                {/* Séances existantes */}
                {planning.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {planning.map((seance, index) => (
                      <span key={index} style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(99, 102, 241, 0.12)',
                        color: 'var(--accent-primary-hover)',
                        border: '1px solid rgba(99, 102, 241, 0.2)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        fontFamily: 'Outfit'
                      }}>
                        <Clock size={13} />
                        {seance.jour} {seance.heure}
                        <button
                          type="button"
                          onClick={() => removeSeance(index)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent-danger)',
                            cursor: 'pointer',
                            padding: '0 0 0 4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Ajout d'une séance */}
                <div className="flex gap-2 items-center">
                  <select 
                    className="form-select" 
                    style={{ flex: 1 }}
                    value={selectedJour}
                    onChange={e => setSelectedJour(e.target.value)}
                  >
                    {JOURS_SEMAINE.map(j => (
                      <option key={j} value={j}>{j}</option>
                    ))}
                  </select>
                  <input 
                    type="time" 
                    className="form-input" 
                    style={{ width: '120px' }}
                    value={selectedHeure}
                    onChange={e => setSelectedHeure(e.target.value)}
                  />
                  <Button type="button" variant="secondary" onClick={addSeance}>
                    + Ajouter
                  </Button>
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary">
                  Enregistrer
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
