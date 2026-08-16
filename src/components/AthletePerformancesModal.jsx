import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Timer, 
  Trophy, 
  TrendingDown, 
  Plus, 
  Calendar, 
  Trash2, 
  Edit,
  X, 
  Sparkles, 
  CheckCircle2, 
  Waves,
  Award,
  Download,
  Share2,
  Sliders,
  Target,
  Activity,
  Zap,
  ArrowDownRight,
  ArrowUpRight,
  MessageCircle,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  ReferenceLine,
  Legend
} from 'recharts';
import { SWIMMING_EVENTS, SWIMMING_STYLES, getSwimmingCategory } from '../utils/swimmingCategories';
import { formatName, formatWhatsAppPhone } from '../utils/formatters';
import { generateSwimmingReportPDF } from '../utils/swimmingReportPdfGenerator';
import toast from 'react-hot-toast';

const PERFORMANCES_STORAGE_PREFIX = 'scb_athlete_perfs_';
const TARGETS_STORAGE_PREFIX = 'scb_athlete_targets_';

/**
 * Convertit une chaîne de temps (ex: "32.45", "32,45", "1:05.20") en secondes numériques
 */
const parseTimeToSeconds = (str = '') => {
  if (!str) return 0;
  const clean = String(str).trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length === 2) {
    const min = parseFloat(parts[0]) || 0;
    const sec = parseFloat(parts[1]) || 0;
    return min * 60 + sec;
  }
  return parseFloat(clean) || 0;
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
  const [selectedStyleId, setSelectedStyleId] = useState('NL'); // 'NL', 'DOS', 'BRASSE', 'PAP', '4N'
  const [selectedEventId, setSelectedEventId] = useState('50_NL');
  const [bassinFilter, setBassinFilter] = useState('all'); // 'all' | '25m' | '50m'
  const [contexteFilter, setContexteFilter] = useState('all'); // 'all' | 'Entraînement' | 'Compétition' | 'Test'
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPerfId, setEditingPerfId] = useState(null);
  const [deletingPerfId, setDeletingPerfId] = useState(null); // Pour confirmation de suppression sécurisée
  const [showTargetInput, setShowTargetInput] = useState(false);
  const [targetGoalTime, setTargetGoalTime] = useState(''); // ex: 31.50

  const modalBodyRef = useRef(null);

  // Formulaire de saisie enrichi
  const initialFormState = {
    event_id: '50_NL',
    time_str: '',
    date_perf: new Date().toISOString().split('T')[0],
    bassin: '25m', // '25m' | '50m'
    contexte: 'Entraînement', // 'Entraînement', 'Compétition', 'Test'
    split_50: '', // Temps de passage au 50m
    reaction_time: '', // Temps de réaction (ex: 0.68)
    stroke_count: '', // Nombre de coups de bras
    rpe: '8', // Sensation / effort 1 à 10
    observations: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const category = useMemo(() => {
    return getSwimmingCategory(athlete?.date_naissance);
  }, [athlete]);

  // Événements appartenant au style sélectionné
  const currentStyleEvents = useMemo(() => {
    return SWIMMING_EVENTS.filter(ev => ev.styleId === selectedStyleId);
  }, [selectedStyleId]);

  // Changer de style -> sélectionner automatiquement la 1ère distance du style
  const handleSelectStyle = (styleId) => {
    setSelectedStyleId(styleId);
    const firstEvent = SWIMMING_EVENTS.find(ev => ev.styleId === styleId);
    if (firstEvent) {
      setSelectedEventId(firstEvent.id);
      setFormData(prev => ({ ...prev, event_id: firstEvent.id }));
    }
  };

  // Charger les données de l'athlète
  useEffect(() => {
    if (!athlete?.id) return;

    const swimKey = `${PERFORMANCES_STORAGE_PREFIX}${athlete.id}`;
    const localSwim = localStorage.getItem(swimKey);
    if (localSwim) {
      try {
        setPerformances(JSON.parse(localSwim));
      } catch {}
    }

    const targetKey = `${TARGETS_STORAGE_PREFIX}${athlete.id}_${selectedEventId}`;
    const savedTarget = localStorage.getItem(targetKey);
    if (savedTarget) {
      setTargetGoalTime(savedTarget);
    } else {
      setTargetGoalTime('');
    }
  }, [athlete, selectedEventId]);

  // Synchroniser le style sélectionné si l'événement change
  useEffect(() => {
    const ev = SWIMMING_EVENTS.find(e => e.id === selectedEventId);
    if (ev && ev.styleId !== selectedStyleId) {
      setSelectedStyleId(ev.styleId);
    }
  }, [selectedEventId]);

  // Sauvegarder les objectifs cibles
  const handleSaveTarget = (val) => {
    setTargetGoalTime(val);
    if (athlete?.id) {
      const targetKey = `${TARGETS_STORAGE_PREFIX}${athlete.id}_${selectedEventId}`;
      if (val) {
        localStorage.setItem(targetKey, val);
      } else {
        localStorage.removeItem(targetKey);
      }
    }
  };

  // Sauvegarde Performances
  const savePerformances = (newList) => {
    setPerformances(newList);
    if (athlete?.id) {
      localStorage.setItem(`${PERFORMANCES_STORAGE_PREFIX}${athlete.id}`, JSON.stringify(newList));
    }
  };

  // Ouvrir le formulaire pour modification
  const handleStartEdit = (perf) => {
    setEditingPerfId(perf.id);
    
    // Aligner le style et l'épreuve active
    const ev = SWIMMING_EVENTS.find(e => e.id === perf.event_id);
    if (ev) {
      setSelectedStyleId(ev.styleId);
      setSelectedEventId(ev.id);
    }

    // Pré-remplir le formulaire
    setFormData({
      event_id: perf.event_id,
      time_str: perf.seconds ? (perf.seconds >= 60 ? formatSecondsToChrono(perf.seconds).replace(' s', '') : perf.seconds.toFixed(2)) : '',
      date_perf: perf.date_perf || new Date().toISOString().split('T')[0],
      bassin: perf.bassin || '25m',
      contexte: perf.contexte || 'Entraînement',
      split_50: perf.split_50 || '',
      reaction_time: perf.reaction_time || '',
      stroke_count: perf.stroke_count || '',
      rpe: String(perf.rpe || 8),
      observations: perf.observations || ''
    });

    setShowAddForm(true);

    // Faire défiler vers le formulaire en haut
    setTimeout(() => {
      modalBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  // Ajout ou Modification d'un chrono Natation
  const handleSubmitPerformance = (e) => {
    e.preventDefault();
    const seconds = parseTimeToSeconds(formData.time_str);
    if (seconds <= 0) {
      toast.error('Veuillez entrer un temps valide (ex: 32.50 ou 1:04.20)');
      return;
    }

    const selectedEvent = SWIMMING_EVENTS.find(ev => ev.id === formData.event_id) || SWIMMING_EVENTS[0];

    if (editingPerfId) {
      // Modification
      const updated = performances.map(p => {
        if (p.id === editingPerfId) {
          return {
            ...p,
            event_id: formData.event_id,
            event_label: selectedEvent.label,
            seconds,
            chrono_str: formatSecondsToChrono(seconds),
            date_perf: formData.date_perf,
            bassin: formData.bassin,
            contexte: formData.contexte,
            split_50: (formData.split_50 || '').trim(),
            reaction_time: (formData.reaction_time || '').trim(),
            stroke_count: (formData.stroke_count || '').trim(),
            rpe: Number(formData.rpe) || 8,
            observations: formData.observations || ''
          };
        }
        return p;
      });

      savePerformances(updated);
      toast.success(`Chrono mis à jour : ${formatSecondsToChrono(seconds)} (${selectedEvent.label}) ! ✏️`);
      setEditingPerfId(null);
    } else {
      // Nouvel Ajout
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
        split_50: (formData.split_50 || '').trim(),
        reaction_time: (formData.reaction_time || '').trim(),
        stroke_count: (formData.stroke_count || '').trim(),
        rpe: Number(formData.rpe) || 8,
        observations: formData.observations || ''
      };

      const updated = [newPerf, ...performances];
      savePerformances(updated);
      toast.success(`Nouveau chrono enregistré : ${newPerf.event_label} en ${newPerf.chrono_str} ! 🏊`);
    }

    setFormData(initialFormState);
    setShowAddForm(false);
  };

  // Suppression directe confirmée
  const handleConfirmDelete = (perfId) => {
    const filtered = performances.filter(p => p.id !== perfId);
    savePerformances(filtered);
    setDeletingPerfId(null);
    toast.success('Chrono supprimé avec succès ! 🗑️');
  };

  // Filtrage des performances pour l'épreuve et les filtres sélectionnés
  const filteredEventPerfs = useMemo(() => {
    return performances
      .filter(p => p.event_id === selectedEventId)
      .filter(p => bassinFilter === 'all' || p.bassin === bassinFilter)
      .filter(p => contexteFilter === 'all' || p.contexte === contexteFilter)
      .sort((a, b) => new Date(a.date_perf) - new Date(b.date_perf));
  }, [performances, selectedEventId, bassinFilter, contexteFilter]);

  // Record Personnel (PB) sur l'épreuve et le bassin sélectionné
  const personalBest = useMemo(() => {
    if (filteredEventPerfs.length === 0) return null;
    return [...filteredEventPerfs].sort((a, b) => a.seconds - b.seconds)[0];
  }, [filteredEventPerfs]);

  // Construction des données du graphique
  const chartData = useMemo(() => {
    const dateCounts = {};

    return filteredEventPerfs.map((p, idx, arr) => {
      let baseDate = 'Séance';
      try {
        baseDate = new Date(p.date_perf).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      } catch {}
      
      dateCounts[baseDate] = (dateCounts[baseDate] || 0) + 1;
      const displayLabel = dateCounts[baseDate] > 1 ? `${baseDate} (#${dateCounts[baseDate]})` : baseDate;

      const sliceStart = Math.max(0, idx - 2);
      const windowPerfs = arr.slice(sliceStart, idx + 1);
      const movingAvg = (windowPerfs.reduce((s, it) => s + it.seconds, 0) / windowPerfs.length).toFixed(2);

      return {
        id: p.id,
        date: displayLabel,
        rawDate: p.date_perf,
        temps: p.seconds,
        chrono: p.chrono_str,
        moyenneMobile: parseFloat(movingAvg),
        contexte: p.contexte,
        bassin: p.bassin,
        rpe: p.rpe
      };
    });
  }, [filteredEventPerfs]);

  // Export PDF Bilan
  const handleExportPDF = async () => {
    const toastId = toast.loading("Génération de la fiche bilan PDF...");
    try {
      await generateSwimmingReportPDF(athlete, performances);
      toast.success("Fiche bilan téléchargée ! 🖨️", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la génération du PDF", { id: toastId });
    }
  };

  // Partage WhatsApp aux Parents
  const handleWhatsAppShare = () => {
    const phone = formatWhatsAppPhone(athlete.telephone || athlete.telephone_tuteur || athlete.contact_urgence);
    if (!phone) {
      toast.error("Numéro de téléphone du tuteur/parent non renseigné.");
      return;
    }

    const pbList = SWIMMING_EVENTS.map(ev => {
      const perfs = performances.filter(p => p.event_id === ev.id).sort((a, b) => a.seconds - b.seconds);
      if (perfs.length > 0) {
        return `• ${ev.label} : *${perfs[0].chrono_str}* (${perfs[0].bassin || '25m'})`;
      }
      return null;
    }).filter(Boolean);

    const message = `🏊 *Sporting Club Bouira - Bilan Natation*\n\nBonjour, voici les performances et records de *${athlete.prenom}* (${category.label}) :\n\n🏆 *Records Personnels (PB) :*\n${pbList.length > 0 ? pbList.join('\n') : 'En cours d\'évaluation'}\n\n📊 Total de séances chronométrées : *${performances.length}*\nBravo pour les efforts et la progression constante aux bassins ! 🌟`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

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
        width: '960px',
        maxWidth: '96vw',
        maxHeight: '94vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
        border: '1.5px solid rgba(56, 189, 248, 0.3)'
      }}>
        {/* HEADER DE LA MODALE */}
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)] flex flex-wrap justify-between items-center gap-3" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <div className="flex items-center gap-3">
            <div style={{ padding: '9px', borderRadius: '12px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
              <Waves size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Suivi Analytique des Chronos
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
                Nageur(se) : <strong style={{ color: 'var(--text-primary)' }}>{formatName(athlete?.nom, athlete?.prenom)}</strong> ({athlete?.groupes?.nom || athlete?.groupe || 'Section Natation'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportPDF}
              className="btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '8px'
              }}
              title="Télécharger la fiche bilan de progression en PDF A4"
            >
              <Download size={14} /> Fiche Bilan PDF
            </button>

            <button
              onClick={handleWhatsAppShare}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0.4rem 0.75rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 211, 102, 0.15)',
                color: '#25D366',
                border: '1px solid rgba(37, 211, 102, 0.3)',
                cursor: 'pointer'
              }}
              title="Envoyer un récapitulatif WhatsApp aux parents"
            >
              <Share2 size={14} /> WhatsApp Parents
            </button>

            <button
              onClick={() => {
                if (showAddForm) {
                  setShowAddForm(false);
                  setEditingPerfId(null);
                  setFormData(initialFormState);
                } else {
                  setEditingPerfId(null);
                  setFormData(initialFormState);
                  setShowAddForm(true);
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0.4rem 0.85rem',
                borderRadius: '8px',
                backgroundColor: showAddForm ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: showAddForm ? '#ef4444' : 'var(--accent-success)',
                border: `1px solid ${showAddForm ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              {showAddForm ? <X size={14} /> : <Plus size={14} />}
              <span>{showAddForm ? 'Fermer formulaire' : '+ Nouveau Chrono'}</span>
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
        <div ref={modalBodyRef} className="p-5 overflow-y-auto" style={{ flex: 1 }}>
          {/* FORMULAIRE D'AJOUT / MODIFICATION ENRICHI */}
          {showAddForm && (
            <div className="p-4 rounded-xl mb-5" style={{ 
              backgroundColor: editingPerfId ? 'rgba(99, 102, 241, 0.09)' : 'rgba(56, 189, 248, 0.06)', 
              border: `1.5px solid ${editingPerfId ? 'rgba(99, 102, 241, 0.5)' : 'rgba(56, 189, 248, 0.3)'}`,
              boxShadow: editingPerfId ? '0 0 15px rgba(99, 102, 241, 0.2)' : 'none'
            }}>
              <div className="flex justify-between items-center mb-3">
                <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: editingPerfId ? '#818cf8' : '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {editingPerfId ? <Edit size={16} /> : <Timer size={16} />}
                  {editingPerfId ? 'Modifier le Chrono Sélectionné' : 'Saisie d\'un Nouveau Chrono'}
                </h3>
                <span className="text-xs text-muted">
                  {editingPerfId ? 'Enregistrement instantané' : 'Tous les champs avec * sont obligatoires'}
                </span>
              </div>

              <form onSubmit={handleSubmitPerformance}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="form-label text-xs">Épreuve de Natation *</label>
                    <select 
                      value={formData.event_id} 
                      onChange={(e) => setFormData(prev => ({ ...prev, event_id: e.target.value }))}
                      className="form-select text-xs font-semibold"
                      required
                    >
                      {SWIMMING_STYLES.map(style => (
                        <optgroup key={style.id} label={`${style.icon} ${style.label}`}>
                          {SWIMMING_EVENTS.filter(e => e.styleId === style.id).map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.label}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-xs">Temps Réalisé (ex: 32.50 ou 1:04.20) *</label>
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
                    <label className="form-label text-xs">Date de la séance *</label>
                    <input 
                      type="date" 
                      value={formData.date_perf} 
                      onChange={(e) => setFormData(prev => ({ ...prev, date_perf: e.target.value }))}
                      className="form-input text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="form-label text-xs">Bassin</label>
                    <select 
                      value={formData.bassin} 
                      onChange={(e) => setFormData(prev => ({ ...prev, bassin: e.target.value }))}
                      className="form-select text-xs"
                    >
                      <option value="25m">🏊 Petit Bassin (25m)</option>
                      <option value="50m">🌊 Bassin Olympique (50m)</option>
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
                    <label className="form-label text-xs">Passage 50m (Split)</label>
                    <input 
                      type="text" 
                      placeholder="ex: 15.20 s"
                      value={formData.split_50} 
                      onChange={(e) => setFormData(prev => ({ ...prev, split_50: e.target.value }))}
                      className="form-input text-xs"
                    />
                  </div>

                  <div>
                    <label className="form-label text-xs">Temps Réaction (plot)</label>
                    <input 
                      type="text" 
                      placeholder="ex: 0.68 s"
                      value={formData.reaction_time} 
                      onChange={(e) => setFormData(prev => ({ ...prev, reaction_time: e.target.value }))}
                      className="form-input text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="form-label text-xs">Coups de bras (Stroke count)</label>
                    <input 
                      type="text" 
                      placeholder="ex: 32 coups / 50m"
                      value={formData.stroke_count} 
                      onChange={(e) => setFormData(prev => ({ ...prev, stroke_count: e.target.value }))}
                      className="form-input text-xs"
                    />
                  </div>

                  <div>
                    <label className="form-label text-xs">Sensation / Effort (RPE 1-10)</label>
                    <select 
                      value={formData.rpe} 
                      onChange={(e) => setFormData(prev => ({ ...prev, rpe: e.target.value }))}
                      className="form-select text-xs font-semibold"
                    >
                      <option value="10">🔥 10/10 - Effort Maximal / Sprint</option>
                      <option value="9">⚡ 9/10 - Très intense / Compétition</option>
                      <option value="8">🟢 8/10 - Très en forme / Rythme fort</option>
                      <option value="7">🟢 7/10 - Bonnes sensations</option>
                      <option value="6">🟡 6/10 - Modéré / Technique</option>
                      <option value="5">🟡 5/10 - Légère fatigue</option>
                      <option value="4">🔴 4/10 - Fatigue ressentie</option>
                      <option value="3">🔴 3/10 - Douleur / Difficulté</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label text-xs">Observations Entraîneur</label>
                    <input 
                      type="text" 
                      placeholder="ex: Bonne coulée, virage explosif"
                      value={formData.observations} 
                      onChange={(e) => setFormData(prev => ({ ...prev, observations: e.target.value }))}
                      className="form-input text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-2">
                  <button 
                    type="button" 
                    className="btn-secondary text-xs" 
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingPerfId(null);
                      setFormData(initialFormState);
                    }}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary text-xs" 
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '5px',
                      backgroundColor: editingPerfId ? '#6366f1' : undefined
                    }}
                  >
                    <CheckCircle2 size={14} /> {editingPerfId ? 'Enregistrer les modifications' : 'Valider le chrono'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* DISPOSITION STRUCTURÉE ET ERGONOMIQUE DES NAGES */}
          {/* ======================================================== */}
          <div className="p-3.5 rounded-2xl mb-4" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
            
            {/* LIGNE 1 : FAMILLES DE NAGES (ONGLETS PRINCIPAUX) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-3 border-b border-[rgba(255,255,255,0.06)] scrollbar-none">
              <span className="text-xs text-muted font-bold mr-1" style={{ whiteSpace: 'nowrap' }}>
                Nage :
              </span>
              {SWIMMING_STYLES.map(style => {
                const isSelected = selectedStyleId === style.id;
                const perfsInStyle = performances.filter(p => {
                  const ev = SWIMMING_EVENTS.find(e => e.id === p.event_id);
                  return ev && ev.styleId === style.id;
                }).length;

                return (
                  <button
                    key={style.id}
                    onClick={() => handleSelectStyle(style.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '0.45rem 1rem',
                      borderRadius: '10px',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      backgroundColor: isSelected ? `${style.color}25` : 'rgba(255,255,255,0.04)',
                      color: isSelected ? style.color : 'var(--text-muted)',
                      border: isSelected ? `1.5px solid ${style.color}` : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span>{style.icon}</span>
                    <span>{style.label}</span>
                    {perfsInStyle > 0 && (
                      <span style={{ 
                        fontSize: '0.65rem', 
                        padding: '1px 6px', 
                        borderRadius: '9999px', 
                        backgroundColor: isSelected ? style.color : 'rgba(255,255,255,0.1)',
                        color: isSelected ? '#000' : 'var(--text-primary)',
                        fontWeight: 800
                      }}>
                        {perfsInStyle}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* LIGNE 2 : DISTANCES DISPONIBLES DANS LE STYLE SÉLECTIONNÉ */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted font-bold mr-1">
                Distance :
              </span>
              {currentStyleEvents.map(ev => {
                const isSelected = selectedEventId === ev.id;
                const eventPerfs = performances.filter(p => p.event_id === ev.id);
                const bestChrono = eventPerfs.length > 0 
                  ? [...eventPerfs].sort((a, b) => a.seconds - b.seconds)[0].chrono_str 
                  : null;

                return (
                  <button
                    key={ev.id}
                    onClick={() => {
                      setSelectedEventId(ev.id);
                      setFormData(prev => ({ ...prev, event_id: ev.id }));
                    }}
                    style={{
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.4rem 0.9rem',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.03)',
                      color: isSelected ? '#38bdf8' : 'var(--text-primary)',
                      border: isSelected ? '1.5px solid #38bdf8' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      minWidth: '78px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>
                      {ev.shortLabel}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: bestChrono ? 'var(--accent-success)' : 'var(--text-muted)', fontWeight: 600, marginTop: '1px' }}>
                      {bestChrono ? `PB: ${bestChrono}` : 'Aucun PB'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* BARRE DE FILTRES AVANCÉS (BASSIN 25M/50M & CONTEXTE) */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl mb-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-bold">🏊 Bassin :</span>
              <div className="flex rounded-lg overflow-hidden border border-[rgba(255,255,255,0.1)]">
                <button
                  onClick={() => setBassinFilter('all')}
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: bassinFilter === 'all' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                    color: bassinFilter === 'all' ? '#38bdf8' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Tous bassins
                </button>
                <button
                  onClick={() => setBassinFilter('25m')}
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: bassinFilter === '25m' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                    color: bassinFilter === '25m' ? '#38bdf8' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  25m (Petit)
                </button>
                <button
                  onClick={() => setBassinFilter('50m')}
                  style={{
                    padding: '3px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: bassinFilter === '50m' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                    color: bassinFilter === '50m' ? '#38bdf8' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  50m (Olympique)
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-bold">Contexte :</span>
              <select
                value={contexteFilter}
                onChange={(e) => setContexteFilter(e.target.value)}
                className="form-select text-xs"
                style={{ width: '140px', padding: '3px 8px' }}
              >
                <option value="all">Tous contextes</option>
                <option value="Compétition">🏆 Compétitions</option>
                <option value="Entraînement">🏊 Entraînements</option>
                <option value="Test">⏱️ Tests</option>
              </select>

              <button
                onClick={() => setShowTargetInput(prev => !prev)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: targetGoalTime ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.06)',
                  color: targetGoalTime ? '#f59e0b' : 'var(--text-muted)',
                  border: targetGoalTime ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="Définir un Minima de qualification ou un Objectif"
              >
                <Target size={13} />
                <span>{targetGoalTime ? `Obj: ${targetGoalTime}s` : '+ Objectif'}</span>
              </button>
            </div>
          </div>

          {/* SAISIE DE L'OBJECTIF SAISONNIER */}
          {showTargetInput && (
            <div className="p-3 rounded-lg mb-4 flex items-center gap-3" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)' }}>
              <Target size={16} color="#f59e0b" />
              <span className="text-xs">Objectif Chrono / Minima FAN (secondes) :</span>
              <input
                type="number"
                step="0.01"
                placeholder="ex: 31.00"
                value={targetGoalTime}
                onChange={(e) => handleSaveTarget(e.target.value)}
                className="form-input text-xs"
                style={{ width: '120px', padding: '3px 8px' }}
              />
              <span className="text-xs text-muted">Cette ligne de référence apparaîtra sur le graphique de progression.</span>
            </div>
          )}

          {/* KPI ET RECORD PERSONNEL */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-5">
            <div className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Épreuve & Bassin</span>
                <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {SWIMMING_EVENTS.find(e => e.id === selectedEventId)?.label} ({bassinFilter})
                </strong>
              </div>
              <Waves size={18} color="#38bdf8" />
            </div>

            <div className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--accent-success)', display: 'block', fontWeight: 700 }}>
                  🏆 Record Personnel (PB)
                </span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--accent-success)', fontFamily: 'Outfit' }}>
                  {personalBest ? personalBest.chrono_str : 'Aucun temps'}
                </strong>
              </div>
              <Award size={22} color="var(--accent-success)" />
            </div>

            <div className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Dernier Chrono</span>
                <strong style={{ fontSize: '1.2rem', color: '#38bdf8', fontFamily: 'Outfit' }}>
                  {filteredEventPerfs.length > 0 ? filteredEventPerfs[filteredEventPerfs.length - 1].chrono_str : '-'}
                </strong>
              </div>
              <Activity size={18} color="#38bdf8" />
            </div>

            <div className="p-3 rounded-xl flex items-center justify-between" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Total Passages</span>
                <strong style={{ fontSize: '1.2rem', color: '#818cf8', fontFamily: 'Outfit' }}>
                  {filteredEventPerfs.length} passage(s)
                </strong>
              </div>
              <Timer size={18} color="#818cf8" />
            </div>
          </div>

          {/* GRAPHIQUE ANALYTIQUE ENRICHI */}
          {chartData.length > 1 && (
            <div className="p-4 rounded-xl mb-5" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div className="flex justify-between items-center mb-3">
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <TrendingDown size={16} color="var(--accent-success)" />
                  Évolution Chronométrique & Courbe de Tendance
                </h4>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#38bdf8' }} /> Chronos réels
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#a855f7' }} /> Moyenne mobile
                  </span>
                  {targetGoalTime && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
                      <span style={{ width: '8px', height: '2px', backgroundColor: '#f59e0b' }} /> Minima/Objectif
                    </span>
                  )}
                </div>
              </div>

              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '0.8rem' }}
                    formatter={(val, name) => [
                      `${Number(val).toFixed(2)} s`, 
                      name === 'temps' ? 'Chrono' : name === 'moyenneMobile' ? 'Moyenne mobile' : name
                    ]}
                  />
                  
                  {personalBest && (
                    <ReferenceLine 
                      y={personalBest.seconds} 
                      stroke="#10b981" 
                      strokeDasharray="4 4" 
                      label={{ value: `PB: ${personalBest.chrono_str}`, fill: '#10b981', fontSize: 10, position: 'right' }} 
                    />
                  )}

                  {targetGoalTime && parseFloat(targetGoalTime) > 0 && (
                    <ReferenceLine 
                      y={parseFloat(targetGoalTime)} 
                      stroke="#f59e0b" 
                      strokeDasharray="3 3" 
                      label={{ value: `Obj: ${targetGoalTime}s`, fill: '#f59e0b', fontSize: 10, position: 'left' }} 
                    />
                  )}

                  <Line type="monotone" dataKey="temps" name="temps" stroke="#38bdf8" strokeWidth={3} dot={{ r: 5, fill: '#38bdf8' }} activeDot={{ r: 7 }} />
                  <Line type="monotone" dataKey="moyenneMobile" name="moyenneMobile" stroke="#a855f7" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* TABLEAU DES CHRONOS ENRICHI (AVEC BOUTONS MODIFIER ET SUPPRIMER FIABLES) */}
          <div className="table-responsive">
            <table style={{ width: '100%', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Temps Réalisé</th>
                  <th>Progression (Δ)</th>
                  <th>Bassin</th>
                  <th>Passage 50m</th>
                  <th>Plot / Coups</th>
                  <th>Sensation</th>
                  <th>Contexte</th>
                  <th>Observations</th>
                  <th style={{ textAlign: 'right', minWidth: '110px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEventPerfs.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center text-muted py-6">
                      Aucun chrono enregistré pour les filtres sélectionnés. Cliquez sur <strong>"+ Nouveau Chrono"</strong>.
                    </td>
                  </tr>
                ) : (
                  [...filteredEventPerfs].reverse().map((perf, index, reversedArr) => {
                    const isPB = personalBest && personalBest.id === perf.id;
                    const isEditing = editingPerfId === perf.id;
                    const isDeleting = deletingPerfId === perf.id;
                    
                    const prevPerf = reversedArr[index + 1];
                    let delta = null;
                    if (prevPerf) {
                      delta = (perf.seconds - prevPerf.seconds).toFixed(2);
                    }

                    return (
                      <tr key={perf.id} style={{ backgroundColor: isEditing ? 'rgba(99, 102, 241, 0.12)' : isDeleting ? 'rgba(239, 68, 68, 0.12)' : undefined }}>
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
                        <td>
                          {delta !== null ? (
                            <span style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '2px', 
                              fontSize: '0.75rem', 
                              fontWeight: 700, 
                              color: Number(delta) <= 0 ? 'var(--accent-success)' : '#f87171' 
                            }}>
                              {Number(delta) <= 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
                              {Number(delta) <= 0 ? `${delta}s 🚀` : `+${delta}s`}
                            </span>
                          ) : (
                            <span className="text-muted text-xs">-</span>
                          )}
                        </td>
                        <td><span className="badge" style={{ fontSize: '0.7rem' }}>{perf.bassin}</span></td>
                        <td>{perf.split_50 || '-'}</td>
                        <td>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {perf.reaction_time ? `Plot: ${perf.reaction_time}` : ''} {perf.stroke_count ? `(${perf.stroke_count})` : ''}
                            {!perf.reaction_time && !perf.stroke_count && '-'}
                          </span>
                        </td>
                        <td>
                          {perf.rpe ? (
                            <span style={{ 
                              padding: '1px 6px', 
                              borderRadius: '4px', 
                              fontSize: '0.7rem', 
                              fontWeight: 700,
                              backgroundColor: perf.rpe >= 8 ? 'rgba(16, 185, 129, 0.15)' : perf.rpe >= 6 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: perf.rpe >= 8 ? 'var(--accent-success)' : perf.rpe >= 6 ? '#f59e0b' : '#f87171'
                            }}>
                              {perf.rpe}/10
                            </span>
                          ) : '-'}
                        </td>
                        <td>
                          <span style={{ fontSize: '0.75rem' }}>
                            {perf.contexte === 'Compétition' ? '🏆 Compét.' : perf.contexte === 'Test' ? '⏱️ Test' : '🏊 Entraîn.'}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{perf.observations || '-'}</td>
                        
                        {/* ACTIONS AVEC CONFIRMATION EN LIGNE INTÉGRÉE */}
                        <td style={{ textAlign: 'right' }}>
                          {isDeleting ? (
                            <div className="flex items-center justify-end gap-1">
                              <span style={{ fontSize: '0.68rem', color: '#f87171', fontWeight: 700 }}>Supprimer ?</span>
                              <button
                                onClick={() => handleConfirmDelete(perf.id)}
                                style={{
                                  padding: '2px 6px',
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  borderRadius: '4px',
                                  backgroundColor: '#ef4444',
                                  color: '#fff',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Oui
                              </button>
                              <button
                                onClick={() => setDeletingPerfId(null)}
                                style={{
                                  padding: '2px 6px',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(255,255,255,0.1)',
                                  color: 'var(--text-muted)',
                                  border: 'none',
                                  cursor: 'pointer'
                                }}
                              >
                                Non
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-end gap-1.5 items-center">
                              <button
                                onClick={() => handleStartEdit(perf)}
                                style={{ 
                                  background: 'none', 
                                  border: '1px solid rgba(99, 102, 241, 0.3)', 
                                  backgroundColor: isEditing ? '#6366f1' : 'rgba(99, 102, 241, 0.1)',
                                  color: isEditing ? '#fff' : '#818cf8', 
                                  cursor: 'pointer', 
                                  padding: '4px 7px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700
                                }}
                                title="Modifier ce chrono"
                              >
                                <Edit size={12} /> Modif.
                              </button>
                              <button
                                onClick={() => setDeletingPerfId(perf.id)}
                                style={{ 
                                  background: 'none', 
                                  border: '1px solid rgba(239, 68, 68, 0.25)', 
                                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                  color: '#f87171', 
                                  cursor: 'pointer', 
                                  padding: '4px 7px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  fontSize: '0.72rem'
                                }}
                                title="Supprimer ce chrono"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
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
