import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, Button, Skeleton } from '../components/ui';
import { Users, Clock, Edit2, Plus, UserPlus, Trash2, CalendarDays } from 'lucide-react';
import { useGroupes } from '../hooks/useGroupes';
import toast from 'react-hot-toast';

const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function GroupsManagement() {
  const { groupes, loading, fetchGroupes } = useGroupes();
  const [trainers, setTrainers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  
  const [formData, setFormData] = useState({
    nom: '',
    capacite_max: 20,
    entraineur_id: '',
    horaires: ''
  });

  // Planning structuré : tableau de { jour, heure }
  const [planning, setPlanning] = useState([]);
  const [newJour, setNewJour] = useState('Dimanche');
  const [newHeure, setNewHeure] = useState('10:00');

  useEffect(() => {
    async function fetchTrainers() {
      const { data } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('role', 'entraineur');
      if (data) setTrainers(data);
    }
    fetchTrainers();
  }, []);

  // Parse le texte horaires en tableau structuré
  const parseHoraires = (horairesText) => {
    if (!horairesText) return [];
    try {
      const parsed = JSON.parse(horairesText);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Si ce n'est pas du JSON, essayer de parser le texte libre
    }
    return [];
  };

  // Convertir le planning en texte stockable
  const planningToString = (planningArr) => {
    return JSON.stringify(planningArr);
  };

  // Formater pour l'affichage
  const formatPlanning = (planningArr) => {
    if (!planningArr || planningArr.length === 0) return null;
    return planningArr.map(s => `${s.jour} ${s.heure}`).join(' · ');
  };

  const addSeance = () => {
    // Vérifier qu'il n'existe pas déjà
    const exists = planning.some(s => s.jour === newJour && s.heure === newHeure);
    if (exists) {
      toast.error('Cette séance existe déjà dans le planning.');
      return;
    }
    setPlanning(prev => [...prev, { jour: newJour, heure: newHeure }]);
  };

  const removeSeance = (index) => {
    setPlanning(prev => prev.filter((_, i) => i !== index));
  };

  const handleEdit = (groupe) => {
    setEditingGroup(groupe);
    setFormData({
      nom: groupe.nom,
      capacite_max: groupe.capacite_max || 20,
      entraineur_id: groupe.entraineur_id || '',
      horaires: groupe.horaires || ''
    });
    setPlanning(parseHoraires(groupe.horaires));
    setIsModalOpen(true);
  };

  const handleNew = () => {
    setEditingGroup(null);
    setFormData({
      nom: '',
      capacite_max: 20,
      entraineur_id: '',
      horaires: ''
    });
    setPlanning([]);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        entraineur_id: formData.entraineur_id || null,
        capacite_max: parseInt(formData.capacite_max),
        horaires: planningToString(planning)
      };

      if (editingGroup) {
        const { error } = await supabase
          .from('groupes')
          .update(payload)
          .eq('id', editingGroup.id);
        if (error) throw error;
        toast.success("Groupe mis à jour avec succès");
      } else {
        const { error } = await supabase
          .from('groupes')
          .insert([payload]);
        if (error) throw error;
        toast.success("Nouveau groupe créé avec succès");
      }
      setIsModalOpen(false);
      fetchGroupes();
    } catch (err) {
      toast.error(err.message || "Erreur lors de l'enregistrement");
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1>Groupes & Plannings</h1>
          <p style={{ marginBottom: 0 }}>Gérez les capacités, horaires et entraîneurs.</p>
        </div>
        <Button variant="primary" onClick={handleNew}>
          <Plus size={18} /> Nouveau Groupe
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton height="220px" />
          <Skeleton height="220px" />
          <Skeleton height="220px" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groupes.map(groupe => {
            const inscrits = groupe.athletes ? groupe.athletes.length : 0;
            const capacite = groupe.capacite_max || 20;
            const percentage = Math.min(100, Math.round((inscrits / capacite) * 100));
            const planningData = parseHoraires(groupe.horaires);
            
            let progressColor = 'var(--accent-success)';
            if (percentage >= 100) progressColor = 'var(--accent-danger)';
            else if (percentage >= 80) progressColor = 'var(--accent-warning)';

            return (
              <Card key={groupe.id} className="flex-col justify-between" style={{ padding: '1.5rem' }}>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{groupe.nom}</h2>
                    <button 
                      onClick={() => handleEdit(groupe)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-3 mb-4">
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <UserPlus size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span>Entraîneur: <strong style={{ color: 'var(--text-primary)' }}>{groupe.profiles?.email || 'Non assigné'}</strong></span>
                    </div>
                    
                    {/* Planning affiché sous forme de pilules */}
                    <div className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <CalendarDays size={14} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '3px' }} />
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
                          <span style={{ color: 'var(--text-muted)' }}>Pas de planning défini</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
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
                    <div className="text-xs mt-2" style={{ color: 'var(--accent-danger)', textAlign: 'right' }}>Groupe complet</div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Edition */}
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
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.email}</option>
                  ))}
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

                {/* Ajouter une séance */}
                <div className="flex gap-2 items-end">
                  <div style={{ flex: 1 }}>
                    <select
                      className="form-select"
                      value={newJour}
                      onChange={e => setNewJour(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    >
                      {JOURS.map(jour => (
                        <option key={jour} value={jour}>{jour}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <input
                      type="time"
                      className="form-input"
                      value={newHeure}
                      onChange={e => setNewHeure(e.target.value)}
                      style={{ fontSize: '0.85rem' }}
                    />
                  </div>
                  <Button type="button" variant="secondary" onClick={addSeance} style={{ flexShrink: 0, padding: '0.6rem 0.875rem' }}>
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 justify-end mt-2">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Annuler</Button>
                <Button type="submit" variant="primary">Enregistrer</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
