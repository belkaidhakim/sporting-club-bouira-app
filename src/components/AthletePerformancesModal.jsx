import React, { useState, useEffect, useMemo } from 'react';
import { 
  Timer, 
  Trophy, 
  TrendingDown, 
  Plus, 
  Calendar, 
  Trash2, 
  X, 
  Sparkles, 
  CheckCircle2, 
  Waves,
  Award
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { SWIMMING_EVENTS, getSwimmingCategory } from '../utils/swimmingCategories';
import { formatName } from '../utils/formatters';
import toast from 'react-hot-toast';

const PERFORMANCES_STORAGE_PREFIX = 'scb_athlete_perfs_';

/**
 * Convertit une chaîne de temps (ex: "32.45" ou "1:05.20") en secondes numériques
 */
const parseTimeToSeconds = (str = '') => {
  if (!str) return 0;
  const parts = str.trim().split(':');
  if (parts.length === 2) {
    const min = parseFloat(parts[0]) || 0;
    const sec = parseFloat(parts[1]) || 0;
    return min * 60 + sec;
  }
  return parseFloat(str) || 0;
};

/**
 * Formate un nombre de secondes en affichage chrono standard (ex: "31.45 s" ou "1:04.20")
 */
const formatSecondsToChrono = (sec) => {
  if (!sec || isNaN(sec)) return '--:--';
  if (sec >= 60) {
    const min = Math.floor(sec / 60);
    const remainder = (sec % 60).toFixed(2);
    return `${min}:${remainder.padStart(5, '0')}`;
  }
  return `${sec.toFixed(2)} s`;
};

export default function AthletePerformancesModal({ athlete, onClose }) {
  const [performances, setPerformances] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('50_NL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    event_id: '50_NL',
    time_str: '',
    date_perf: new Date().toISOString().split('T')[0],
    bassin: '25m', // '25m' | '50m'
    contexte: 'Entraînement', // 'Entraînement', 'Compétition', 'Test'
    observations: ''
  });

  const category = useMemo(() => {
    return getSwimmingCategory(athlete?.date_naissance);
  }, [athlete]);

  // Charger les données sauvegardées
  useEffect(() => {
    if (!athlete?.id) return;

    const swimKey = `${PERFORMANCES_STORAGE_PREFIX}${athlete.id}`;
    const localSwim = localStorage.getItem(swimKey);
    if (localSwim) {
      try {
        setPerformances(JSON.parse(localSwim));
      } catch {}
    }
  }, [athlete]);

  // Sauvegarde Natation
  const savePerformances = (newList) => {
    setPerformances(newList);
    if (athlete?.id) {
      localStorage.setItem(`${PERFORMANCES_STORAGE_PREFIX}${athlete.id}`, JSON.stringify(newList));
    }
  };

  // Ajout d'un chrono Natation
  const handleAddPerformance = (e) => {
    e.preventDefault();
    const seconds = parseTimeToSeconds(formData.time_str);
    if (seconds <= 0) {
      toast.error('Veuillez entrer un temps valide (ex: 32.50 ou 1:04.20)');
      return;
    }

    const selectedEvent = SWIMMING_EVENTS.find(ev => ev.id === formData.event_id) || SWIMMING_EVENTS[0];

    const newPerf = {
      id: `perf-${Date.now()}`,
      athlete_id: athlete.id,
      event_id: formData.event_id,
      event_label: selectedEvent.label,
      seconds,
      chrono_str: formatSecondsToChrono(seconds),
      date_perf: formData.date_perf,
      bassin: formData.bassin,
      contexte: formData.contexte,
      observations: formData.observations
    };

    const updated = [newPerf, ...performances];
    savePerformances(updated);
    toast.success(`Chrono enregistré : ${newPerf.event_label} en ${newPerf.chrono_str} ! 🏊`);
    
    setFormData(prev => ({
      ...prev,
      time_str: '',
      observations: ''
    }));
    setShowAddForm(false);
  };

  // Performances pour l'épreuve Natation sélectionnée
  const currentEventPerfs = useMemo(() => {
    return performances
      .filter(p => p.event_id === selectedEventId)
      .sort((a, b) => new Date(a.date_perf) - new Date(b.date_perf));
  }, [performances, selectedEventId]);

  const personalBest = useMemo(() => {
    if (currentEventPerfs.length === 0) return null;
    return [...currentEventPerfs].sort((a, b) => a.seconds - b.seconds)[0];
  }, [currentEventPerfs]);

  const chartData = useMemo(() => {
    return currentEventPerfs.map(p => ({
      date: new Date(p.date_perf).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      temps: p.seconds,
      chrono: p.chrono_str,
      contexte: p.contexte
    }));
  }, [currentEventPerfs]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      zIndex: 120,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      backdropFilter: 'blur(8px)'
    }}>
      <div className="glass-panel" style={{
        width: '880px',
        maxWidth: '96vw',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        border: '1.5px solid rgba(56, 189, 248, 0.3)'
      }}>
        {/* HEADER DE LA MODALE */}
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)] flex justify-between items-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div className="flex items-center gap-3">
            <div style={{ padding: '9px', borderRadius: '12px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <Waves size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Suivi des Chronos & Performances
                </h2>
                <span style={{ 
                  padding: '2px 8px', 
                  borderRadius: '9999px', 
                  fontSize: '0.72rem', 
                  fontWeight: 800,
                  backgroundColor: category.badgeBg,
                  color: category.color,
                  border: `1px solid ${category.color}40`
                }}>
                  {category.label}
                </span>
              </div>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Athlète : <strong style={{ color: 'var(--text-primary)' }}>{formatName(athlete?.nom, athlete?.prenom)}</strong> ({athlete?.groupes?.nom || athlete?.groupe || 'Section Natation'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(prev => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                backgroundColor: showAddForm ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: showAddForm ? '#ef4444' : 'var(--accent-success)',
                border: `1px solid ${showAddForm ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {showAddForm ? <X size={14} /> : <Plus size={14} />}
              <span>{showAddForm ? 'Fermer saisie' : '+ Nouveau Chrono'}</span>
            </button>

            <button 
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px' }}
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* CORPS DE LA MODALE */}
        <div className="p-5 overflow-y-auto" style={{ flex: 1 }}>
          {/* Formulaire d'ajout chrono */}
          {showAddForm && (
            <div className="p-4 rounded-xl mb-5" style={{ backgroundColor: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              <form onSubmit={handleAddPerformance}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="form-label text-xs">Épreuve de Natation *</label>
                    <select 
                      value={formData.event_id} 
                      onChange={(e) => setFormData(prev => ({ ...prev, event_id: e.target.value }))}
                      className="form-select text-xs"
                      required
                    >
                      {SWIMMING_EVENTS.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-xs">Temps réalisé (ex: 32.50 ou 1:04.20) *</label>
                    <input 
                      type="text" 
                      placeholder="00:32.45"
                      value={formData.time_str} 
                      onChange={(e) => setFormData(prev => ({ ...prev, time_str: e.target.value }))}
                      className="form-input text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label text-xs">Date du Chrono *</label>
                    <input 
                      type="date" 
                      value={formData.date_perf} 
                      onChange={(e) => setFormData(prev => ({ ...prev, date_perf: e.target.value }))}
                      className="form-input text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="form-label text-xs">Bassin</label>
                    <select 
                      value={formData.bassin} 
                      onChange={(e) => setFormData(prev => ({ ...prev, bassin: e.target.value }))}
                      className="form-select text-xs"
                    >
                      <option value="25m">Petit Bassin (25m)</option>
                      <option value="50m">Grand Bassin Olympique (50m)</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-xs">Contexte</label>
                    <select 
                      value={formData.contexte} 
                      onChange={(e) => setFormData(prev => ({ ...prev, contexte: e.target.value }))}
                      className="form-select text-xs"
                    >
                      <option value="Entraînement">🏊 Entraînement</option>
                      <option value="Compétition">🏆 Compétition Officielle</option>
                      <option value="Test">⏱️ Test Chronométré</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-xs">Observations / Notes</label>
                    <input 
                      type="text" 
                      placeholder="ex: Départ plongé, virage amélioré"
                      value={formData.observations} 
                      onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                      className="form-input text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button type="button" className="btn-secondary text-xs" onClick={() => setShowAddForm(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary text-xs" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <CheckCircle2 size={14} /> Valider le chrono
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Barre des épreuves */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
            {SWIMMING_EVENTS.map(ev => {
              const hasPerfs = performances.some(p => p.event_id === ev.id);
              const isSelected = selectedEventId === ev.id;
              return (
                <button
                  key={ev.id}
                  onClick={() => setSelectedEventId(ev.id)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'var(--bg-tertiary)',
                    color: isSelected ? '#38bdf8' : 'var(--text-muted)',
                    border: isSelected ? '1.5px solid rgba(56, 189, 248, 0.5)' : '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                >
                  {ev.label} {hasPerfs && <span style={{ color: '#34d399', marginLeft: '3px' }}>●</span>}
                </button>
              );
            })}
          </div>

          {/* KPI et Record Personnel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <div className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Épreuve Sélectionnée</span>
                <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {SWIMMING_EVENTS.find(e => e.id === selectedEventId)?.label}
                </strong>
              </div>
              <Waves size={20} color="#38bdf8" />
            </div>

            <div className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-success)', display: 'block', fontWeight: 700 }}>
                  🏆 Record Personnel (PB)
                </span>
                <strong style={{ fontSize: '1.15rem', color: 'var(--accent-success)', fontFamily: 'Outfit' }}>
                  {personalBest ? personalBest.chrono_str : 'Aucun temps'}
                </strong>
              </div>
              <Award size={22} color="var(--accent-success)" />
            </div>

            <div className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Chronos Enregistrés</span>
                <strong style={{ fontSize: '1.15rem', color: '#818cf8', fontFamily: 'Outfit' }}>
                  {currentEventPerfs.length} passage(s)
                </strong>
              </div>
              <Timer size={20} color="#818cf8" />
            </div>
          </div>

          {/* Graphique de progression */}
          {chartData.length > 1 && (
            <div className="p-4 rounded-xl mb-5" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingDown size={16} color="var(--accent-success)" />
                Évolution Chronométrique (Objectif : Baisser le chrono ⏱️)
              </h4>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8rem' }}
                    formatter={(val) => [`${Number(val).toFixed(2)} s`, 'Temps']}
                  />
                  <Line type="monotone" dataKey="temps" stroke="#38bdf8" strokeWidth={3} dot={{ r: 5, fill: '#38bdf8' }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Tableau chronos */}
          <div className="table-responsive">
            <table style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Temps Réalisé</th>
                  <th>Bassin</th>
                  <th>Contexte</th>
                  <th>Observations</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentEventPerfs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-6">Aucun chrono enregistré pour cette épreuve. Cliquez sur "+ Nouveau Chrono".</td>
                  </tr>
                ) : (
                  currentEventPerfs.map(perf => {
                    const isPB = personalBest && personalBest.id === perf.id;
                    return (
                      <tr key={perf.id}>
                        <td>{new Date(perf.date_perf).toLocaleDateString('fr-FR')}</td>
                        <td>
                          <strong style={{ color: isPB ? 'var(--accent-success)' : 'var(--text-primary)', fontSize: '0.9rem' }}>
                            {perf.chrono_str}
                          </strong>
                          {isPB && (
                            <span style={{ marginLeft: '6px', padding: '1px 6px', borderRadius: '9999px', fontSize: '0.65rem', fontWeight: 800, backgroundColor: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-success)' }}>
                              🏆 PB
                            </span>
                          )}
                        </td>
                        <td><span className="badge" style={{ fontSize: '0.7rem' }}>{perf.bassin}</span></td>
                        <td>{perf.contexte}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{perf.observations || '-'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              const filtered = performances.filter(p => p.id !== perf.id);
                              savePerformances(filtered);
                            }}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
