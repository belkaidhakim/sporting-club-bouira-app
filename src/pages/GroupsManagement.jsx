import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, Button, Badge, Skeleton } from '../components/ui';
import { Users, Clock, Edit2, Plus, UserPlus } from 'lucide-react';
import { useGroupes } from '../hooks/useGroupes';
import toast from 'react-hot-toast';

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

  const handleEdit = (groupe) => {
    setEditingGroup(groupe);
    setFormData({
      nom: groupe.nom,
      capacite_max: groupe.capacite_max || 20,
      entraineur_id: groupe.entraineur_id || '',
      horaires: groupe.horaires || ''
    });
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
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        entraineur_id: formData.entraineur_id || null,
        capacite_max: parseInt(formData.capacite_max)
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
          <p>Gérez les capacités et assignez les entraîneurs.</p>
        </div>
        <Button variant="primary" onClick={handleNew}>
          <Plus size={18} /> Nouveau Groupe
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton height="200px" />
          <Skeleton height="200px" />
          <Skeleton height="200px" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groupes.map(groupe => {
            const inscrits = groupe.athletes ? groupe.athletes.length : 0;
            const capacite = groupe.capacite_max || 20;
            const percentage = Math.min(100, Math.round((inscrits / capacite) * 100));
            
            let progressColor = 'var(--accent-success)';
            if (percentage >= 100) progressColor = 'var(--accent-danger)';
            else if (percentage >= 80) progressColor = 'var(--accent-warning)';

            return (
              <Card key={groupe.id} className="flex-col justify-between" style={{ padding: '1.5rem' }}>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-xl m-0">{groupe.nom}</h2>
                    <button 
                      onClick={() => handleEdit(groupe)}
                      className="btn-icon" 
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Edit2 size={18} />
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <UserPlus size={16} className="text-muted" />
                      Entraîneur: <strong className="text-primary">{groupe.profiles?.email || 'Non assigné'}</strong>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <Clock size={16} className="text-muted" />
                      Horaires: <strong className="text-primary">{groupe.horaires || 'Non définis'}</strong>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className="text-muted flex items-center gap-1"><Users size={16} /> Remplissage</span>
                    <span style={{ fontWeight: 'bold' }}>{inscrits} / {capacite}</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        width: `${percentage}%`, 
                        backgroundColor: progressColor,
                        borderRadius: '4px',
                        transition: 'width 0.5s ease-out'
                      }} 
                    />
                  </div>
                  {percentage >= 100 && (
                    <div className="text-xs text-danger mt-2 text-right">Groupe complet</div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Edition */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <Card style={{ width: '100%', maxWidth: '500px', margin: '1rem' }}>
            <h2 className="mb-4">{editingGroup ? 'Modifier le Groupe' : 'Nouveau Groupe'}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="form-group">
                <label>Nom du Groupe</label>
                <input 
                  type="text" 
                  className="input" 
                  required 
                  value={formData.nom}
                  onChange={e => setFormData({...formData, nom: e.target.value})}
                  placeholder="Ex: Poussins, Elite..."
                />
              </div>
              <div className="form-group">
                <label>Capacité Maximum</label>
                <input 
                  type="number" 
                  className="input" 
                  required 
                  min="1"
                  value={formData.capacite_max}
                  onChange={e => setFormData({...formData, capacite_max: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Entraîneur Assigné</label>
                <select 
                  className="input"
                  value={formData.entraineur_id}
                  onChange={e => setFormData({...formData, entraineur_id: e.target.value})}
                >
                  <option value="">-- Aucun entraîneur assigné --</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.email}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Horaires (Texte libre)</label>
                <input 
                  type="text" 
                  className="input" 
                  value={formData.horaires}
                  onChange={e => setFormData({...formData, horaires: e.target.value})}
                  placeholder="Ex: Lundi et Mercredi 18h - 20h"
                />
              </div>
              <div className="flex gap-4 justify-end mt-4">
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
