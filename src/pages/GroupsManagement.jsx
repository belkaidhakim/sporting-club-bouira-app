import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, Button, Skeleton } from '../components/ui';
import { Users, Edit2, Plus, CalendarDays, Clock, Trash2 } from 'lucide-react';
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
    const formatted = username
      .replace(/[._\d]+/g, ' ')
      .trim()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    const initial = formatted.charAt(0).toUpperCase() || 'E';
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
  const [planning, setPlanning] = useState([]); // Array d'objets { jour: 'Mardi', heure: '10:30' }
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
          <Skeleton height="260px" />
          <Skeleton height="260px" />
          <Skeleton height="260px" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {groupes.map(groupe => {
            const inscrits = groupe.athletes ? groupe.athletes.length : 0;
            const capacite = groupe.capacite_max || 20;
            const percentage = Math.min(100, Math.round((inscrits / capacite) * 100));
            const planningData = parseHoraires(groupe.horaires);
            const trainerInfo = getTrainerDisplayName(groupe.profiles);
            
            let progressColor = 'var(--accent-success)';
            if (percentage >= 100) progressColor = 'var(--accent-danger)';
            else if (percentage >= 80) progressColor = 'var(--accent-warning)';

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
                    {/* Entête Carte */}
                    <div className="flex justify-between items-start mb-4">
                      <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>{groupe.nom}</h2>
                      <button 
                        onClick={() => handleOpenModal(groupe)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                        title="Modifier le groupe"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                    
                    <div className="flex flex-col gap-3 mb-4">
                      {/* Entraîneur avec Avatar Circulaire et Nom soigné */}
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

                  {/* Section Remplissage toujours alignée parfaitement en bas */}
                  <div className="mt-auto pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Users size={14} /> Remplissage</span>
                      <span style={{ fontWeight: 'bold' }}>{inscrits} / {capacite}</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          height: '100%', 
                          width: `${percentage}%`, 
                          backgroundColor: progressColor,
                          borderRadius: '3px',
                          transition: 'width 0.5s ease-out',
                          boxShadow: `0 0 8px ${progressColor}40`
                        }} 
                      />
                    </div>
                    {percentage >= 100 && (
                      <div className="text-xs mt-2" style={{ color: 'var(--accent-danger)', textAlign: 'right', fontWeight: 600 }}>Groupe complet</div>
                    )}
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
