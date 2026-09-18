import React, { useState } from 'react';
import { useSchedule } from '../hooks/useSchedule';
import { useGroupes } from '../hooks/useGroupes';
import { useTheme } from '../contexts/ThemeContext';
import { 
  Calendar as CalendarIcon, Plus, Clock, Users, User, MapPin, 
  MoreVertical, Edit2, Trash2, X
} from 'lucide-react';
import { Button, Card } from '../components/ui';
import toast from 'react-hot-toast';

const DAYS = [
  { id: 0, label: 'Dimanche', short: 'Dim' },
  { id: 1, label: 'Lundi', short: 'Lun' },
  { id: 2, label: 'Mardi', short: 'Mar' },
  { id: 3, label: 'Mercredi', short: 'Mer' },
  { id: 4, label: 'Jeudi', short: 'Jeu' },
  { id: 5, label: 'Vendredi', short: 'Ven' },
  { id: 6, label: 'Samedi', short: 'Sam' },
];

export default function Schedule() {
  const { schedule, addSession, editSession, deleteSession } = useSchedule();
  const { groupes } = useGroupes();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  
  const [formData, setFormData] = useState({
    dayOfWeek: 0,
    startTime: '17:00',
    endTime: '18:30',
    groupId: '',
    groupName: '',
    coachName: '',
    poolLanes: 'Bassin 25m, Lignes 1-2',
    color: '#38bdf8'
  });

  const handleOpenModal = (session = null) => {
    if (session) {
      setEditingSession(session);
      setFormData({
        dayOfWeek: session.dayOfWeek,
        startTime: session.startTime,
        endTime: session.endTime,
        groupId: session.groupId || '',
        groupName: session.groupName || '',
        coachName: session.coachName || '',
        poolLanes: session.poolLanes || '',
        color: session.color || '#38bdf8'
      });
    } else {
      setEditingSession(null);
      setFormData({
        dayOfWeek: 0,
        startTime: '17:00',
        endTime: '18:30',
        groupId: '',
        groupName: '',
        coachName: '',
        poolLanes: 'Bassin 25m, Lignes 1-2',
        color: '#38bdf8'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSession(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingSession) {
      await editSession(editingSession.id, formData);
    } else {
      await addSession(formData);
    }
    handleCloseModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer ce créneau ?")) {
      await deleteSession(id);
    }
  };

  // Grouper les sessions par jour et les trier par heure
  const scheduleByDay = DAYS.map(day => {
    const daySessions = schedule
      .filter(s => s.dayOfWeek === day.id)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return { ...day, sessions: daySessions };
  });

  const colors = [
    { label: 'Bleu', value: '#38bdf8' },
    { label: 'Vert', value: '#10b981' },
    { label: 'Violet', value: '#a855f7' },
    { label: 'Orange', value: '#f97316' },
    { label: 'Rose', value: '#ec4899' },
    { label: 'Jaune', value: '#eab308' },
    { label: 'Rouge', value: '#ef4444' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <CalendarIcon className="text-primary" size={32} />
            Planning Hebdomadaire
          </h1>
          <p className="text-muted mt-1">Organisez les créneaux d'entraînement, les groupes et les lignes d'eau.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
          <Plus size={18} /> Ajouter un créneau
        </Button>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-[1200px]">
          {scheduleByDay.map((day) => (
            <div key={day.id} className="flex-1 min-w-[200px] flex flex-col gap-4">
              {/* En-tête du jour */}
              <div className="sticky top-0 z-10 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 text-center shadow-sm">
                <h3 className="font-extrabold text-lg text-[var(--text-primary)]">{day.label}</h3>
                <span className="text-xs font-bold text-muted bg-[var(--bg-tertiary)] px-2 py-1 rounded-md mt-2 inline-block">
                  {day.sessions.length} séance(s)
                </span>
              </div>

              {/* Liste des séances */}
              <div className="flex flex-col gap-3">
                {day.sessions.length === 0 ? (
                  <div className="text-center p-6 border-2 border-dashed border-[var(--border-color)] rounded-xl text-muted text-sm font-medium">
                    Aucun créneau
                  </div>
                ) : (
                  day.sessions.map(session => (
                    <div 
                      key={session.id} 
                      className="rounded-xl border shadow-sm p-4 relative group transition-all hover:-translate-y-1 hover:shadow-md"
                      style={{ 
                        backgroundColor: 'var(--bg-card)', 
                        borderColor: 'var(--border-color)',
                        borderLeftWidth: '6px',
                        borderLeftColor: session.color || '#38bdf8'
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-[var(--text-primary)] leading-tight pr-6">
                          {session.groupName || session.groupId || 'Séance'}
                        </div>
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-[var(--bg-card)] rounded-md shadow-sm border border-[var(--border-color)] p-1 z-10">
                          <button onClick={() => handleOpenModal(session)} className="p-1 hover:bg-sky-500/10 hover:text-sky-500 rounded transition-colors" title="Modifier">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => handleDelete(session.id)} className="p-1 hover:bg-rose-500/10 hover:text-rose-500 rounded transition-colors" title="Supprimer">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 mt-3">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted">
                          <Clock size={14} className="text-sky-500" />
                          <span>{session.startTime} - {session.endTime}</span>
                        </div>
                        
                        {session.coachName && (
                          <div className="flex items-center gap-2 text-xs font-medium text-muted">
                            <User size={14} className="text-emerald-500" />
                            <span className="truncate">{session.coachName}</span>
                          </div>
                        )}
                        
                        {session.poolLanes && (
                          <div className="flex items-center gap-2 text-xs font-medium text-muted">
                            <MapPin size={14} className="text-rose-500" />
                            <span className="truncate">{session.poolLanes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL AJOUT/EDITION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg bg-[var(--bg-card)] rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-secondary)]">
              <h2 className="text-xl font-bold flex items-center gap-2">
                {editingSession ? <Edit2 className="text-sky-500" /> : <Plus className="text-emerald-500" />}
                {editingSession ? 'Modifier le créneau' : 'Ajouter un créneau'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-black/5 rounded-full transition-colors text-muted">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="scheduleForm" onSubmit={handleSubmit} className="space-y-5">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Jour</label>
                    <select 
                      required
                      className="form-input w-full"
                      value={formData.dayOfWeek}
                      onChange={e => setFormData({...formData, dayOfWeek: parseInt(e.target.value)})}
                    >
                      {DAYS.map(d => (
                        <option key={d.id} value={d.id}>{d.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Couleur</label>
                    <div className="flex gap-2">
                      {colors.map(c => (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setFormData({...formData, color: c.value})}
                          className={`w-8 h-8 rounded-full border-2 transition-transform ${formData.color === c.value ? 'scale-110 border-[var(--text-primary)]' : 'border-transparent hover:scale-110'}`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2">Heure de début</label>
                    <input 
                      type="time" 
                      required
                      className="form-input w-full"
                      value={formData.startTime}
                      onChange={e => setFormData({...formData, startTime: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold mb-2">Heure de fin</label>
                    <input 
                      type="time" 
                      required
                      className="form-input w-full"
                      value={formData.endTime}
                      onChange={e => setFormData({...formData, endTime: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Groupe (Nom de la séance)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Ex: Élite, Avenirs..."
                    className="form-input w-full"
                    value={formData.groupName}
                    onChange={e => setFormData({...formData, groupName: e.target.value})}
                    list="groups-list"
                  />
                  <datalist id="groups-list">
                    {groupes.map(g => (
                      <option key={g.id} value={g.nom} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Entraîneur</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input 
                      type="text" 
                      placeholder="Nom de l'entraîneur (Optionnel)"
                      className="form-input w-full pl-10"
                      value={formData.coachName}
                      onChange={e => setFormData({...formData, coachName: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2">Bassin / Lignes d'eau</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input 
                      type="text" 
                      placeholder="Ex: Bassin 25m - Lignes 1,2,3 (Optionnel)"
                      className="form-input w-full pl-10"
                      value={formData.poolLanes}
                      onChange={e => setFormData({...formData, poolLanes: e.target.value})}
                    />
                  </div>
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex justify-end gap-3">
              <Button variant="outline" onClick={handleCloseModal}>Annuler</Button>
              <Button type="submit" form="scheduleForm">Enregistrer</Button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}

// Manually import framer-motion since it's used in the modal
import { motion } from 'framer-motion';
