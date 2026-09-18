import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Timer, Trophy, TrendingDown, Plus, Calendar, Trash2, Edit, X, 
  Sparkles, CheckCircle2, Waves, Award, Download, Share2, 
  Sliders, Target, Activity, Zap, ArrowDownRight, ArrowUpRight, 
  MessageCircle, HelpCircle, AlertTriangle, Video, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid, ReferenceLine, Legend
} from 'recharts';
import { SWIMMING_EVENTS, SWIMMING_STYLES, getSwimmingCategory } from '../utils/swimmingCategories';
import { formatName, formatWhatsAppPhone } from '../utils/formatters';
import { generateSwimmingReportPDF } from '../utils/swimmingReportPdfGenerator';
import toast from 'react-hot-toast';

const PERFORMANCES_STORAGE_PREFIX = 'scb_athlete_perfs_';
const TARGETS_STORAGE_PREFIX = 'scb_athlete_targets_';

/** 
 * Approx. Base Times (World Records) in seconds for FINA calculation. 
 * Format: { '25m': { '50_NL': 20.16, ... }, '50m': { ... } } 
 * Using simplified unified averages for demo purposes.
 */
const BASE_TIMES = {
  '50_NL': 21.0, '100_NL': 47.0, '200_NL': 102.0, '400_NL': 220.0, '800_NL': 452.0,
  '50_DOS': 24.0, '100_DOS': 52.0, '200_DOS': 113.0,
  '50_BRASSE': 26.0, '100_BRASSE': 57.0, '200_BRASSE': 126.0,
  '50_PAP': 22.5, '100_PAP': 49.5, '200_PAP': 110.0,
  '100_4N': 50.5, '200_4N': 114.0, '400_4N': 243.0
};

/** Calculate FINA Points: P = 1000 * (BaseTime / SwumTime)^3 */
const calculateFINAPoints = (eventId, seconds) => {
  if (!seconds || seconds <= 0) return 0;
  const baseTime = BASE_TIMES[eventId] || BASE_TIMES['50_NL']; // Default fallback
  const points = 1000 * Math.pow((baseTime / seconds), 3);
  return Math.max(0, Math.floor(points));
};

const parseTimeToSeconds = (str = '') => {
  if (!str) return 0;
  const clean = String(str).trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 2) {
    return (parseFloat(parts[0]) || 0) * 60 + (parseFloat(parts[1]) || 0);
  }
  return parseFloat(clean) || 0;
};

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
  const [selectedStyleId, setSelectedStyleId] = useState('NL');
  const [selectedEventId, setSelectedEventId] = useState('50_NL');
  const [bassinFilter, setBassinFilter] = useState('all');
  const [contexteFilter, setContexteFilter] = useState('all');
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPerfId, setEditingPerfId] = useState(null);
  const [deletingPerfId, setDeletingPerfId] = useState(null);
  
  const [showTargetInput, setShowTargetInput] = useState(false);
  const [targetGoalTime, setTargetGoalTime] = useState('');
  
  // Accordion State for Expanded Rows
  const [expandedRowId, setExpandedRowId] = useState(null);

  const modalBodyRef = useRef(null);

  const initialFormState = {
    event_id: '50_NL',
    time_str: '',
    date_perf: new Date().toISOString().split('T')[0],
    bassin: '25m',
    contexte: 'Entraînement',
    splits: '', // Comma separated splits
    reaction_time: '',
    stroke_rate: '', // Fréquence de bras (ex: 45)
    turn_time: '', // Temps de virage
    rpe: '8',
    observations: '',
    video_url: '' // YouTube / Drive Link
  };
  const [formData, setFormData] = useState(initialFormState);

  const category = useMemo(() => getSwimmingCategory(athlete?.date_naissance), [athlete]);
  const currentStyleEvents = useMemo(() => SWIMMING_EVENTS.filter(ev => ev.styleId === selectedStyleId), [selectedStyleId]);

  const handleSelectStyle = (styleId) => {
    setSelectedStyleId(styleId);
    const firstEvent = SWIMMING_EVENTS.find(ev => ev.styleId === styleId);
    if (firstEvent) {
      setSelectedEventId(firstEvent.id);
      setFormData(prev => ({ ...prev, event_id: firstEvent.id }));
    }
  };

  useEffect(() => {
    if (!athlete?.id) return;
    const localSwim = localStorage.getItem(`${PERFORMANCES_STORAGE_PREFIX}${athlete.id}`);
    if (localSwim) {
      try { setPerformances(JSON.parse(localSwim)); } catch {}
    }
    const savedTarget = localStorage.getItem(`${TARGETS_STORAGE_PREFIX}${athlete.id}_${selectedEventId}`);
    setTargetGoalTime(savedTarget || '');
  }, [athlete, selectedEventId]);

  useEffect(() => {
    const ev = SWIMMING_EVENTS.find(e => e.id === selectedEventId);
    if (ev && ev.styleId !== selectedStyleId) setSelectedStyleId(ev.styleId);
  }, [selectedEventId, selectedStyleId]);

  const handleSaveTarget = (val) => {
    setTargetGoalTime(val);
    if (athlete?.id) {
      const key = `${TARGETS_STORAGE_PREFIX}${athlete.id}_${selectedEventId}`;
      if (val) localStorage.setItem(key, val);
      else localStorage.removeItem(key);
    }
  };

  const savePerformances = (newList) => {
    setPerformances(newList);
    if (athlete?.id) localStorage.setItem(`${PERFORMANCES_STORAGE_PREFIX}${athlete.id}`, JSON.stringify(newList));
  };

  const filteredEventPerfs = useMemo(() => {
    return performances
      .filter(p => p.event_id === selectedEventId)
      .filter(p => bassinFilter === 'all' || p.bassin === bassinFilter)
      .filter(p => contexteFilter === 'all' || p.contexte === contexteFilter)
      .sort((a, b) => new Date(a.date_perf) - new Date(b.date_perf));
  }, [performances, selectedEventId, bassinFilter, contexteFilter]);

  const personalBest = useMemo(() => {
    if (filteredEventPerfs.length === 0) return null;
    return [...filteredEventPerfs].sort((a, b) => a.seconds - b.seconds)[0];
  }, [filteredEventPerfs]);

  const handleStartEdit = (perf) => {
    setEditingPerfId(perf.id);
    const ev = SWIMMING_EVENTS.find(e => e.id === perf.event_id);
    if (ev) {
      setSelectedStyleId(ev.styleId);
      setSelectedEventId(ev.id);
    }
    setFormData({
      event_id: perf.event_id,
      time_str: perf.seconds >= 60 ? formatSecondsToChrono(perf.seconds).replace(' s', '') : perf.seconds.toFixed(2),
      date_perf: perf.date_perf || new Date().toISOString().split('T')[0],
      bassin: perf.bassin || '25m',
      contexte: perf.contexte || 'Entraînement',
      splits: perf.splits || perf.split_50 || '',
      reaction_time: perf.reaction_time || '',
      stroke_rate: perf.stroke_rate || perf.stroke_count || '',
      turn_time: perf.turn_time || '',
      rpe: String(perf.rpe || 8),
      observations: perf.observations || '',
      video_url: perf.video_url || ''
    });
    setShowAddForm(true);
    setTimeout(() => modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
  };

  const handleSubmitPerformance = (e) => {
    e.preventDefault();
    const seconds = parseTimeToSeconds(formData.time_str);
    if (seconds <= 0) {
      toast.error('Veuillez entrer un temps valide (ex: 32.50 ou 1:04.20)');
      return;
    }

    const selectedEvent = SWIMMING_EVENTS.find(ev => ev.id === formData.event_id) || SWIMMING_EVENTS[0];
    const finaPoints = calculateFINAPoints(formData.event_id, seconds);

    const perfData = {
      event_id: formData.event_id,
      event_label: selectedEvent.label,
      seconds,
      chrono_str: formatSecondsToChrono(seconds),
      fina_points: finaPoints,
      date_perf: formData.date_perf,
      bassin: formData.bassin,
      contexte: formData.contexte,
      splits: formData.splits.trim(),
      reaction_time: formData.reaction_time.trim(),
      stroke_rate: formData.stroke_rate.trim(),
      turn_time: formData.turn_time.trim(),
      rpe: Number(formData.rpe) || 8,
      observations: formData.observations,
      video_url: formData.video_url.trim()
    };

    if (editingPerfId) {
      const updated = performances.map(p => p.id === editingPerfId ? { ...p, ...perfData } : p);
      savePerformances(updated);
      toast.success(`Chrono mis à jour ! ✏️`);
      setEditingPerfId(null);
    } else {
      const newPerf = { id: `perf-${Date.now()}`, athlete_id: athlete.id, ...perfData };
      savePerformances([newPerf, ...performances]);
      toast.success(`Nouveau chrono enregistré ! 🏊`);
    }

    setFormData(initialFormState);
    setShowAddForm(false);
  };

  const handleConfirmDelete = (perfId) => {
    savePerformances(performances.filter(p => p.id !== perfId));
    setDeletingPerfId(null);
    toast.success('Chrono supprimé avec succès ! 🗑️');
  };

  const chartData = useMemo(() => {
    const dateCounts = {};
    return filteredEventPerfs.map((p, idx, arr) => {
      let baseDate = 'Séance';
      try { baseDate = new Date(p.date_perf).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }); } catch {}
      dateCounts[baseDate] = (dateCounts[baseDate] || 0) + 1;
      const sliceStart = Math.max(0, idx - 2);
      const windowPerfs = arr.slice(sliceStart, idx + 1);
      const movingAvg = (windowPerfs.reduce((s, it) => s + it.seconds, 0) / windowPerfs.length).toFixed(2);
      return {
        id: p.id,
        date: dateCounts[baseDate] > 1 ? `${baseDate} (#${dateCounts[baseDate]})` : baseDate,
        temps: p.seconds,
        moyenneMobile: parseFloat(movingAvg)
      };
    });
  }, [filteredEventPerfs]);

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel flex flex-col rounded-2xl overflow-hidden shadow-2xl" style={{ width: '1000px', maxWidth: '96vw', maxHeight: '94vh', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        
        {/* HEADER */}
        <div className="p-4 flex flex-wrap justify-between items-center gap-3 border-b border-[rgba(255,255,255,0.1)] bg-[var(--bg-tertiary)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400"><Waves size={24} /></div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="m-0 text-lg font-bold text-[var(--text-primary)]">Suivi Analytique des Chronos</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold border" style={{ backgroundColor: category.badgeBg, color: category.color, borderColor: `${category.color}40` }}>{category.label}</span>
              </div>
              <span className="text-sm text-muted">Nageur(se) : <strong className="text-[var(--text-primary)]">{formatName(athlete?.nom, athlete?.prenom)}</strong></span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => generateSwimmingReportPDF(athlete, performances)} className="btn-secondary py-1.5 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5" title="Télécharger Bilan PDF"><Download size={14} /> PDF</button>
            <button onClick={() => window.open(`https://wa.me/${formatWhatsAppPhone(athlete.telephone || athlete.telephone_tuteur)}?text=Bilan`, '_blank')} className="btn-secondary py-1.5 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5 text-emerald-500 bg-emerald-500/15 border-emerald-500/30"><Share2 size={14} /> WA</button>
            <button onClick={() => { setShowAddForm(!showAddForm); setEditingPerfId(null); setFormData(initialFormState); }} className="btn-primary py-1.5 px-3 text-xs font-bold rounded-lg flex items-center gap-1.5" style={{ backgroundColor: showAddForm ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: showAddForm ? '#ef4444' : '#10b981', borderColor: 'transparent' }}>
              {showAddForm ? <X size={14} /> : <Plus size={14} />} {showAddForm ? 'Fermer' : '+ Chrono'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:bg-white/10"><X size={22} /></button>
          </div>
        </div>

        {/* BODY */}
        <div ref={modalBodyRef} className="p-5 overflow-y-auto flex-1">
          
          {/* GHOST MODE & FORMULAIRE */}
          {showAddForm && (
            <div className="p-4 rounded-xl mb-5 shadow-lg" style={{ backgroundColor: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-sky-400 m-0 flex items-center gap-1.5">
                  <Timer size={16} /> {editingPerfId ? 'Modifier Chrono' : 'Nouveau Chrono'}
                </h3>
                {personalBest && !editingPerfId && (
                  <div className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md flex items-center gap-1">
                    <Zap size={13} /> Ghost PB: {personalBest.chrono_str}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmitPerformance}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-semibold text-muted">Épreuve *</label>
                    <select value={formData.event_id} onChange={(e) => setFormData(p => ({...p, event_id: e.target.value}))} className="form-select text-xs font-bold">
                      {SWIMMING_STYLES.map(style => (
                        <optgroup key={style.id} label={`${style.icon} ${style.label}`}>
                          {SWIMMING_EVENTS.filter(e => e.styleId === style.id).map(ev => <option key={ev.id} value={ev.id}>{ev.label}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted">Temps (ex: 1:04.20) *</label>
                    <input type="text" value={formData.time_str} onChange={(e) => setFormData(p => ({...p, time_str: e.target.value}))} className="form-input text-xs font-bold" required />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted">Bassin</label>
                    <select value={formData.bassin} onChange={(e) => setFormData(p => ({...p, bassin: e.target.value}))} className="form-select text-xs">
                      <option value="25m">25m</option><option value="50m">50m</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted">Date</label>
                    <input type="date" value={formData.date_perf} onChange={(e) => setFormData(p => ({...p, date_perf: e.target.value}))} className="form-input text-xs" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-muted">Temps de passage (Splits séparés par virgule)</label>
                    <input type="text" placeholder="ex: 28.5, 59.2, 1:30.1" value={formData.splits} onChange={(e) => setFormData(p => ({...p, splits: e.target.value}))} className="form-input text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted">Stroke Rate</label>
                    <input type="text" placeholder="Fréq. bras" value={formData.stroke_rate} onChange={(e) => setFormData(p => ({...p, stroke_rate: e.target.value}))} className="form-input text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted">Tps Virage</label>
                    <input type="text" placeholder="ex: 1.2s" value={formData.turn_time} onChange={(e) => setFormData(p => ({...p, turn_time: e.target.value}))} className="form-input text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted">Réaction</label>
                    <input type="text" placeholder="ex: 0.68s" value={formData.reaction_time} onChange={(e) => setFormData(p => ({...p, reaction_time: e.target.value}))} className="form-input text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-semibold text-muted">Lien Vidéo (YouTube / Drive)</label>
                    <input type="url" placeholder="https://..." value={formData.video_url} onChange={(e) => setFormData(p => ({...p, video_url: e.target.value}))} className="form-input text-xs" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted">Observations</label>
                    <input type="text" placeholder="Technique..." value={formData.observations} onChange={(e) => setFormData(p => ({...p, observations: e.target.value}))} className="form-input text-xs" />
                  </div>
                  <div className="flex items-end justify-end gap-2">
                    <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary text-xs py-1.5 px-3">Annuler</button>
                    <button type="submit" className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-sky-500 text-white"><CheckCircle2 size={14}/> {editingPerfId ? 'Modifier' : 'Valider'}</button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* BARRE DES NAGES (EPURÉE) */}
          <div className="p-3.5 rounded-2xl mb-4 bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 border-b border-white/5 scrollbar-none">
              <span className="text-xs text-muted font-bold mr-1">Nage:</span>
              {SWIMMING_STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => handleSelectStyle(style.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${selectedStyleId === style.id ? 'border' : 'border border-transparent'}`}
                  style={{ 
                    backgroundColor: selectedStyleId === style.id ? `${style.color}25` : 'rgba(255,255,255,0.04)',
                    color: selectedStyleId === style.id ? style.color : 'var(--text-muted)',
                    borderColor: selectedStyleId === style.id ? style.color : 'transparent'
                  }}
                >
                  {style.icon} {style.label}
                </button>
              ))}
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted font-bold mr-1">Distance:</span>
              {currentStyleEvents.map(ev => {
                const isSelected = selectedEventId === ev.id;
                const bestChrono = performances.filter(p => p.event_id === ev.id).sort((a, b) => a.seconds - b.seconds)[0]?.chrono_str;
                return (
                  <button
                    key={ev.id}
                    onClick={() => { setSelectedEventId(ev.id); setFormData(p => ({...p, event_id: ev.id})); }}
                    className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border transition-all ${isSelected ? 'bg-sky-500/20 text-sky-400 border-sky-400' : 'bg-white/5 text-[var(--text-primary)] border-[var(--border-color)]'}`}
                    style={{ minWidth: '70px' }}
                  >
                    <span className="text-sm font-bold">{ev.shortLabel}</span>
                    {/* Epuration: On n'affiche plus "Aucun PB" */}
                    {bestChrono && <span className="text-[10px] text-emerald-500 font-bold mt-0.5">{bestChrono}</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* MINIMAS ET FILTRES */}
          <div className="flex flex-wrap justify-between gap-3 mb-4">
            <div className="flex gap-2 bg-[var(--bg-tertiary)] p-1.5 rounded-lg border border-[var(--border-color)]">
              <button onClick={() => setBassinFilter('all')} className={`px-2 py-1 text-xs font-bold rounded ${bassinFilter === 'all' ? 'bg-sky-500/20 text-sky-400' : 'text-muted'}`}>Tous bassins</button>
              <button onClick={() => setBassinFilter('25m')} className={`px-2 py-1 text-xs font-bold rounded ${bassinFilter === '25m' ? 'bg-sky-500/20 text-sky-400' : 'text-muted'}`}>25m</button>
              <button onClick={() => setBassinFilter('50m')} className={`px-2 py-1 text-xs font-bold rounded ${bassinFilter === '50m' ? 'bg-sky-500/20 text-sky-400' : 'text-muted'}`}>50m</button>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => setShowTargetInput(!showTargetInput)} className="btn-secondary px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 text-amber-500 bg-amber-500/10 border-amber-500/30">
                <Target size={14} /> {targetGoalTime ? `Minima: ${targetGoalTime}s` : 'Définir Minima'}
              </button>
            </div>
          </div>

          {showTargetInput && (
            <div className="p-2 mb-4 rounded-lg flex items-center gap-2 bg-amber-500/10 border border-amber-500/30">
              <Target size={14} className="text-amber-500" />
              <span className="text-xs text-amber-500">Minima Officiel (s) :</span>
              <input type="number" step="0.01" value={targetGoalTime} onChange={(e) => handleSaveTarget(e.target.value)} className="form-input text-xs py-1 px-2 w-24" />
            </div>
          )}

          {/* GRAPHIQUE LINEAIRE */}
          {chartData.length > 1 && (
            <div className="p-4 rounded-2xl mb-5 bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <h4 className="text-sm font-bold flex items-center gap-2 mb-4 text-[var(--text-primary)]"><TrendingDown size={16} className="text-emerald-500" /> Courbe de Progression</h4>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: 'none', borderRadius: '8px' }} />
                  {personalBest && <ReferenceLine y={personalBest.seconds} stroke="#10b981" strokeDasharray="4 4" label={{ value: `PB: ${personalBest.chrono_str}`, fill: '#10b981', fontSize: 10 }} />}
                  {targetGoalTime && parseFloat(targetGoalTime) > 0 && <ReferenceLine y={parseFloat(targetGoalTime)} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: `Minima`, fill: '#f59e0b', fontSize: 10 }} />}
                  <Line type="monotone" dataKey="temps" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, fill: '#38bdf8' }} />
                  <Line type="monotone" dataKey="moyenneMobile" stroke="#a855f7" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* TABLEAU ACCORDEON */}
          <div className="table-responsive rounded-xl overflow-hidden border border-[var(--border-color)]">
            <table className="w-full text-sm">
              <thead className="bg-black/20 text-xs text-muted">
                <tr>
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Chrono</th>
                  <th className="py-3 px-4 text-center">FINA</th>
                  <th className="py-3 px-4 text-center">Bassin</th>
                  <th className="py-3 px-4 text-center">Vidéo</th>
                  <th className="py-3 px-4 text-right">Détails</th>
                </tr>
              </thead>
              <tbody>
                {filteredEventPerfs.length === 0 ? (
                  <tr><td colSpan="6" className="text-center py-8 text-muted">Aucun chrono enregistré.</td></tr>
                ) : (
                  [...filteredEventPerfs].reverse().map(perf => {
                    const isPB = personalBest?.id === perf.id;
                    const isExpanded = expandedRowId === perf.id;
                    const isQualif = targetGoalTime && perf.seconds <= parseFloat(targetGoalTime);
                    
                    return (
                      <React.Fragment key={perf.id}>
                        <tr className="border-b border-[var(--border-color)] hover:bg-white/5 transition-colors">
                          <td className="py-3 px-4">{new Date(perf.date_perf).toLocaleDateString('fr-FR')}</td>
                          <td className="py-3 px-4 font-bold flex items-center gap-2">
                            <span className={isPB ? 'text-emerald-500' : 'text-[var(--text-primary)]'}>{perf.chrono_str}</span>
                            {isPB && <span className="bg-emerald-500/20 text-emerald-500 text-[10px] px-1.5 py-0.5 rounded">PB</span>}
                            {isQualif && <span className="bg-amber-500/20 text-amber-500 text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5"><Target size={10}/> Q</span>}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-sky-400">{perf.fina_points || '-'}</td>
                          <td className="py-3 px-4 text-center"><span className="text-[10px] bg-white/10 px-2 py-1 rounded">{perf.bassin}</span></td>
                          <td className="py-3 px-4 text-center">
                            {perf.video_url ? <a href={perf.video_url} target="_blank" rel="noreferrer" className="text-rose-500 hover:text-rose-400"><Video size={16} className="mx-auto" /></a> : '-'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex justify-end gap-2 items-center">
                              <button onClick={() => setExpandedRowId(isExpanded ? null : perf.id)} className="p-1 text-muted hover:text-white transition-colors">
                                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* DETAILS ACCORDEON */}
                        {isExpanded && (
                          <tr className="bg-black/30 border-b border-[var(--border-color)]">
                            <td colSpan="6" className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-muted">
                                <div>
                                  <strong className="text-[var(--text-primary)] block mb-2">Temps de passage (Splits) :</strong>
                                  <div className="flex flex-wrap gap-2">
                                    {perf.splits ? perf.splits.split(',').map((s, i) => (
                                      <span key={i} className="bg-sky-500/10 text-sky-400 px-2 py-1 rounded border border-sky-500/20">{s.trim()}</span>
                                    )) : <span>Aucun split enregistré</span>}
                                  </div>
                                </div>
                                <div>
                                  <strong className="text-[var(--text-primary)] block mb-2">Détails techniques :</strong>
                                  <ul className="space-y-1">
                                    <li>Fréq. Bras : <span className="text-white">{perf.stroke_rate || '-'}</span></li>
                                    <li>Virage : <span className="text-white">{perf.turn_time || '-'}</span></li>
                                    <li>Plot : <span className="text-white">{perf.reaction_time || '-'}</span></li>
                                  </ul>
                                </div>
                                <div>
                                  <strong className="text-[var(--text-primary)] block mb-2">Observations :</strong>
                                  <p className="text-white bg-white/5 p-2 rounded italic">{perf.observations || 'Aucune observation'}</p>
                                  
                                  <div className="mt-3 flex gap-2 justify-end">
                                    <button onClick={() => handleStartEdit(perf)} className="btn-secondary text-[10px] py-1 px-2 flex items-center gap-1"><Edit size={12}/> Éditer</button>
                                    <button onClick={() => { if(window.confirm('Supprimer ce chrono ?')) handleConfirmDelete(perf.id); }} className="btn-secondary text-[10px] py-1 px-2 text-rose-500 flex items-center gap-1 border-rose-500/30 bg-rose-500/10"><Trash2 size={12}/> Suppr.</button>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
