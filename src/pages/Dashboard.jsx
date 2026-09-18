import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  AlertTriangle, 
  CreditCard, 
  ScanLine, 
  DollarSign, 
  Clock, 
  UserX, 
  Phone, 
  Check, 
  QrCode, 
  X, 
  MessageCircle, 
  AlertOctagon, 
  HeartPulse, 
  Camera, 
  FileWarning, 
  CheckCircle, 
  ExternalLink, 
  Filter,
  TrendingUp,
  Activity,
  CalendarDays
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  BarChart, 
  Bar, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { supabase } from '../supabaseClient';
import { Card, StatCard, Button, Badge, Skeleton } from '../components/ui';
import BadgeGenerator from '../components/BadgeGenerator';
import { formatWhatsAppPhone, calculateAge, formatName, formatDA } from '../utils/formatters';
import toast from 'react-hot-toast';
import { useTheme } from '../contexts/ThemeContext';

const JOURS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] } }
};

const parseHoraires = (horairesText) => {
  if (!horairesText) return [];
  try {
    const parsed = JSON.parse(horairesText);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  return [];
};

export default function Dashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    todayPresences: 0,
    expectedToday: 0,
    missingRevenue: 0,
    absentTodayList: [],
    expiringSoon: [],
    expiredList: [],
    incompleteFiles: [],
    groupCapacityStats: [],
    totalCapacity: 0,
    totalEnrolled: 0,
    globalFillRate: 0,
    recent: [],
    recentPresences: [],
    dailyPresenceTrend: [],
    revenueBreakdown: [],
    planningToday: [],
    planningTomorrow: []
  });

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('presences'); 
  const [presenceFilter, setPresenceFilter] = useState('today'); 
  const [presenceSearch, setPresenceSearch] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  
  // Modals
  const [showBulkWA, setShowBulkWA] = useState(false);

  // Filtres dynamiques sur la liste des inscrits
  const [inscritsFilterGroup, setInscritsFilterGroup] = useState('ALL');
  const [inscritsFilterStatus, setInscritsFilterStatus] = useState('ALL');
  const [inscritsSearch, setInscritsSearch] = useState('');

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        // Phase 4: Fetch tarif for financial impact
        const { data: athletesData, error: athletesError } = await supabase
          .from('athletes')
          .select(`*, cartes_acces(statut, date_dernier_paiement), cotisations(montant_paye, date_paiement, periode_couverte_fin), groupes(id, nom, horaires, tarif)`)
          .eq('est_actif', true)
          .order('date_inscription', { ascending: false });

        if (athletesError) throw athletesError;

        let active = 0;
        let suspended = 0;
        let missingRevenue = 0;
        
        const now = new Date();
        const in7Days = new Date();
        in7Days.setDate(in7Days.getDate() + 7);

        const expiringSoon = [];
        const expiredList = [];
        const incompleteFiles = [];

        (athletesData || []).forEach(athlete => {
          const statut = athlete.cartes_acces?.statut || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut);
          if (statut === 'ACTIVE') {
            active++;
          } else {
            suspended++;
          }

          // Vérification des dossiers incomplets (ex: pas de certificat médical ou pas de photo)
          const missingCertif = !athlete.certificat_medical_url && !athlete.certificat_medical;
          const missingPhoto = !athlete.photo_url;
          if (missingCertif || missingPhoto) {
            incompleteFiles.push({
              ...athlete,
              missingCertif,
              missingPhoto
            });
          }

          // Analyse des dates de cotisations
          const tarifToUse = athlete.groupes?.tarif || 3000; // Default 3000 if null

          if (athlete.cotisations && athlete.cotisations.length > 0) {
            const sorted = [...athlete.cotisations].sort((a, b) => new Date(b.periode_couverte_fin) - new Date(a.periode_couverte_fin));
            const endDate = new Date(sorted[0].periode_couverte_fin);
            
            if (endDate < now) {
              const daysExpired = Math.max(1, Math.ceil((now - endDate) / (1000 * 60 * 60 * 24)));
              expiredList.push({
                ...athlete,
                endDateStr: endDate.toLocaleDateString('fr-FR'),
                daysExpired
              });
              missingRevenue += tarifToUse; // Impact financier
            } else if (endDate >= now && endDate <= in7Days) {
              const daysLeft = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
              expiringSoon.push({
                ...athlete,
                endDateStr: endDate.toLocaleDateString('fr-FR'),
                daysLeft
              });
            }
          } else {
            expiredList.push({
              ...athlete,
              endDateStr: 'Aucune',
              daysExpired: 99
            });
            missingRevenue += tarifToUse; // Impact financier
          }
        });

        // Date de début d'aujourd'hui
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Scans d'aujourd'hui
        const { data: todayScans } = await supabase
          .from('presences')
          .select('athlete_id')
          .gte('date_scan', todayStart.toISOString());

        const todayScansSet = new Set(todayScans?.map(p => p.athlete_id) || []);
        const uniqueTodayAthletes = todayScansSet.size;

        // Suivi des présences attendues aujourd'hui selon le planning
        const todayDayName = JOURS_FR[new Date().getDay()];
        let tomorrowIndex = new Date().getDay() + 1;
        if (tomorrowIndex > 6) tomorrowIndex = 0;
        const tomorrowDayName = JOURS_FR[tomorrowIndex];

        const expectedTodayList = [];
        const absentTodayList = [];
        const planningTodayMap = new Map();
        const planningTomorrowMap = new Map();

        (athletesData || []).forEach(athlete => {
          if (!athlete.groupes) return;
          const groupName = athlete.groupes.nom;
          const groupHoraires = parseHoraires(athlete.groupes.horaires);
          
          const sessionToday = groupHoraires.find(h => h.jour === todayDayName);
          const sessionTomorrow = groupHoraires.find(h => h.jour === tomorrowDayName);

          if (sessionToday) {
            expectedTodayList.push(athlete);
            if (!planningTodayMap.has(groupName)) planningTodayMap.set(groupName, { nom: groupName, heure: sessionToday.heure, inscrits: 0 });
            planningTodayMap.get(groupName).inscrits += 1;

            if (!todayScansSet.has(athlete.id)) {
              absentTodayList.push({
                ...athlete,
                heureSeance: sessionToday.heure
              });
            }
          }
          
          if (sessionTomorrow) {
            if (!planningTomorrowMap.has(groupName)) planningTomorrowMap.set(groupName, { nom: groupName, heure: sessionTomorrow.heure, inscrits: 0 });
            planningTomorrowMap.get(groupName).inscrits += 1;
          }
        });

        // Historique récent des présences
        const { data: presencesData } = await supabase
          .from('presences')
          .select(`id, date_scan, athlete_id, athletes (nom, prenom, groupe, groupes(nom, horaires))`)
          .order('date_scan', { ascending: false })
          .limit(100);

        // Récupérer les scans des 7 derniers jours pour le graphique multi-courbes
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // 7 points (today included)
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data: weekScans } = await supabase
          .from('presences')
          .select(`date_scan, athletes(groupe, groupes(nom))`)
          .gte('date_scan', sevenDaysAgo.toISOString());

        const dailyTrendMap = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
          const dateStr = d.toISOString().split('T')[0];
          dailyTrendMap[dateStr] = { 
            name: key, 
            Total: 0, 
            Initiation: 0, 
            Apprentissage: 0, 
            ElitePerf: 0,
            date: dateStr 
          };
        }

        (weekScans || []).forEach(scan => {
          const dateStr = scan.date_scan.split('T')[0];
          if (dailyTrendMap[dateStr]) {
            dailyTrendMap[dateStr].Total += 1;
            
            // Catégorisation pour le graphique détaillé (Phase 4)
            const gName = (scan.athletes?.groupes?.nom || scan.athletes?.groupe || '').toLowerCase();
            if (gName.includes('initiation')) {
              dailyTrendMap[dateStr].Initiation += 1;
            } else if (gName.includes('apprent')) {
              dailyTrendMap[dateStr].Apprentissage += 1;
            } else if (gName.includes('elit') || gName.includes('élit') || gName.includes('perf') || gName.includes('entra')) {
              dailyTrendMap[dateStr].ElitePerf += 1;
            }
          }
        });

        const dailyPresenceTrend = Object.values(dailyTrendMap);

        // Statistiques de remplissage des groupes
        const { data: groupesData } = await supabase
          .from('groupes')
          .select('id, nom, capacite_max, athletes(id)');

        let totalCapacity = 0;
        let totalEnrolled = 0;
        const groupCapacityStats = (groupesData || []).map(g => {
          const count = g.athletes ? g.athletes.length : 0;
          const max = g.capacite_max || 20;
          totalCapacity += max;
          totalEnrolled += count;
          const fillRate = Math.min(100, Math.round((count / max) * 100));
          return { id: g.id, nom: g.nom, count, max, fillRate };
        });

        const globalFillRate = totalCapacity > 0 ? Math.min(100, Math.round((totalEnrolled / totalCapacity) * 100)) : 0;

        setStats({
          total: athletesData?.length || 0,
          active,
          suspended,
          todayPresences: uniqueTodayAthletes,
          expectedToday: expectedTodayList.length,
          missingRevenue,
          absentTodayList,
          expiringSoon,
          expiredList,
          incompleteFiles,
          groupCapacityStats,
          totalCapacity,
          totalEnrolled,
          globalFillRate,
          recent: athletesData?.slice(0, 8) || [],
          allAthletes: athletesData || [],
          recentPresences: presencesData || [],
          dailyPresenceTrend,
          planningToday: Array.from(planningTodayMap.values()).sort((a,b) => a.heure.localeCompare(b.heure)),
          planningTomorrow: Array.from(planningTomorrowMap.values()).sort((a,b) => a.heure.localeCompare(b.heure))
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  // Filtrage dynamique des inscrits
  const filteredInscrits = useMemo(() => {
    return (stats.allAthletes || []).filter(athlete => {
      if (inscritsFilterGroup !== 'ALL') {
        const gName = athlete.groupes?.nom || athlete.groupe || '';
        if (gName !== inscritsFilterGroup) return false;
      }

      const statut = athlete.cartes_acces?.statut || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut);
      if (inscritsFilterStatus === 'ACTIVE' && statut !== 'ACTIVE') return false;
      if (inscritsFilterStatus === 'SUSPENDED' && statut === 'ACTIVE') return false;

      if (inscritsSearch) {
        const q = inscritsSearch.toLowerCase();
        const nom = (athlete.nom || '').toLowerCase();
        const prenom = (athlete.prenom || '').toLowerCase();
        return nom.includes(q) || prenom.includes(q);
      }

      return true;
    });
  }, [stats.allAthletes, inscritsFilterGroup, inscritsFilterStatus, inscritsSearch]);

  const athletesWithPhoneToExpire = stats.expiredList.filter(a => a.telephone || a.telephone_tuteur);

  return (
    <div>
      {/* HEADER DU DASHBOARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1>Tableau de bord de Gestion</h1>
          <p style={{ marginBottom: 0 }}>Supervision, assiduité et recouvrement financier.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/scanner" style={{ textDecoration: 'none' }}>
            <Button variant="secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <ScanLine size={17} /> Scanner Bassin
            </Button>
          </Link>
          <Link to="/athletes/new" style={{ textDecoration: 'none' }}>
            <Button variant="primary">
              + Nouvel Athlète
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton height="140px" />
          <Skeleton height="140px" />
          <Skeleton height="140px" />
          <Skeleton height="140px" />
        </div>
      ) : (
        <motion.div 
          variants={containerVariants}
          initial="hidden" 
          animate="visible"
        >
          {/* STAT CARDS DU HAUT */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
            <StatCard
              icon={<Users size={20} />}
              iconBg="rgba(99, 102, 241, 0.1)"
              iconColor="var(--accent-primary)"
              glowColor="rgba(99, 102, 241, 0.15)"
              label="Total Athlètes Inscrits"
              value={stats.total}
            />
            <StatCard
              icon={<ScanLine size={20} />}
              iconBg="rgba(34, 211, 238, 0.1)"
              iconColor="var(--accent-secondary)"
              glowColor="rgba(34, 211, 238, 0.15)"
              label="Présences Aujourd'hui"
              value={`${stats.todayPresences} nageur(s)`}
              subtitle={stats.expectedToday > 0 ? `${stats.todayPresences} sur ${stats.expectedToday} attendus` : `Sur ${stats.active} actifs`}
            />
            {/* Phase 4: Indicateur Financier Remplacé */}
            <StatCard
              icon={<DollarSign size={20} />}
              iconBg="rgba(239, 68, 68, 0.1)"
              iconColor="#ef4444"
              glowColor="rgba(239, 68, 68, 0.15)"
              label="Manque à gagner (Impayés)"
              value={`${formatDA(stats.missingRevenue)} DA`}
              subtitle={`${stats.expiredList.length} cotisations suspendues`}
            />
            <StatCard
              icon={<CreditCard size={20} />}
              iconBg="rgba(16, 185, 129, 0.1)"
              iconColor="var(--accent-success)"
              glowColor="rgba(16, 185, 129, 0.15)"
              label="Cotisations à Jour"
              value={stats.active}
              subtitle={`${stats.expiringSoon.length} arrivent à échéance`}
            />
          </motion.div>

          {/* CENTRE D'ALERTES & PLANNING (PHASE 4) */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            
            {/* ALERTES (Occupe 2 colonnes sur grand écran) */}
            {(stats.expiredList.length > 0 || stats.expiringSoon.length > 0 || stats.incompleteFiles.length > 0) && (
              <Card className="p-5 xl:col-span-2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div style={{ padding: '7px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                      <AlertOctagon size={20} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold mb-0" style={{ color: '#ef4444' }}>
                        Centre d'Alertes
                      </h3>
                      <span className="text-xs text-muted">
                        Actions requises pour le recouvrement
                      </span>
                    </div>
                  </div>
                  
                  {/* Phase 4: Bouton Relances Groupées */}
                  {athletesWithPhoneToExpire.length > 0 && (
                    <Button 
                      variant="primary" 
                      onClick={() => setShowBulkWA(!showBulkWA)}
                      style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', backgroundColor: '#25D366', color: 'white', borderColor: '#25D366' }}
                    >
                      <MessageCircle size={14} style={{ marginRight: '6px', display: 'inline-block' }} /> 
                      {showBulkWA ? "Fermer l'outil WhatsApp" : "Outil Relances Groupées"}
                    </Button>
                  )}
                </div>

                {/* INTERFACE RELANCES GROUPÉES */}
                <AnimatePresence>
                  {showBulkWA && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      className="mb-4 overflow-hidden"
                    >
                      <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(37, 211, 102, 0.05)', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
                        <h4 className="text-sm font-bold mb-2 flex items-center gap-2 text-[#25D366]">
                          <MessageCircle size={16} /> Envoi en chaîne WhatsApp ({athletesWithPhoneToExpire.length} cibles)
                        </h4>
                        <p className="text-xs text-muted mb-3">Cliquez successivement sur chaque bouton pour ouvrir WhatsApp pré-rempli avec le message de relance.</p>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                          {athletesWithPhoneToExpire.map(athlete => {
                            const wpPhone = formatWhatsAppPhone(athlete.telephone || athlete.telephone_tuteur);
                            const msg = `Bonjour ${athlete.prenom}, votre adhésion au SC Bouira a expiré le ${athlete.endDateStr}. Merci de bien vouloir régulariser votre cotisation à la réception du club. Cordialement.`;
                            return (
                              <a
                                key={`bulk-${athlete.id}`}
                                href={`https://wa.me/${wpPhone}?text=${encodeURIComponent(msg)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-80 transition-opacity"
                                style={{ backgroundColor: '#25D366', color: 'white', textDecoration: 'none' }}
                                onClick={(e) => {
                                  // Visuellement marquer comme cliqué
                                  e.currentTarget.style.opacity = '0.5';
                                }}
                              >
                                {athlete.nom} {athlete.prenom} <ExternalLink size={12}/>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ALERTE 1 : COTISATIONS EXPIRÉES */}
                  <div className="p-4 rounded-xl flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444' }}>
                          ❌ Expirées ({stats.expiredList.length})
                        </span>
                        <Badge status="SUSPENDED">Bloqué</Badge>
                      </div>
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                        {stats.expiredList.slice(0, 5).map(athlete => {
                          const wpPhone = formatWhatsAppPhone(athlete.telephone || athlete.telephone_tuteur);
                          return (
                            <div key={athlete.id} className="flex justify-between items-center p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                              <div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{athlete.nom} {athlete.prenom}</span>
                                <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>Expiré ({athlete.endDateStr})</div>
                              </div>
                              <div className="flex items-center gap-1">
                                {wpPhone && (
                                  <a href={`https://wa.me/${wpPhone}?text=${encodeURIComponent(`Bonjour ${athlete.prenom}...`)}`} target="_blank" rel="noreferrer" style={{ padding: '4px 6px', borderRadius: '6px', backgroundColor: 'rgba(37, 211, 102, 0.15)', color: '#25D366' }}>
                                    <MessageCircle size={14} />
                                  </a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ALERTE 2 : RENOUVELLEMENTS SOUS 7 JOURS */}
                  <div className="p-4 rounded-xl flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f59e0b' }}>
                          ⏳ Imminents ({stats.expiringSoon.length})
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '2px 8px', borderRadius: '9999px' }}>
                          &lt; 7 jours
                        </span>
                      </div>
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                        {stats.expiringSoon.slice(0, 5).map(athlete => {
                          return (
                            <div key={athlete.id} className="flex justify-between items-center p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                              <div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{athlete.nom} {athlete.prenom}</span>
                                <div style={{ fontSize: '0.7rem', color: '#f59e0b' }}>Dans {athlete.daysLeft}j</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* PHASE 4: PLANNING SPORTIF */}
            <Card className="p-5 xl:col-span-1 border-l-4" style={{ borderLeftColor: 'var(--accent-primary)' }}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--accent-primary)' }}>
                    <CalendarDays size={18} />
                  </div>
                  <h3 className="text-base font-bold mb-0">Planning Bassin</h3>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Aujourd'hui</h4>
                {stats.planningToday.length === 0 ? (
                  <p className="text-sm text-muted">Aucune séance prévue.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {stats.planningToday.map((seance, idx) => (
                      <li key={`td-${idx}`} className="flex justify-between items-center text-sm p-2 rounded-md" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{seance.nom}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded">{seance.heure}</span>
                          <span className="text-xs text-muted">({seance.inscrits} inscrits)</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">Demain</h4>
                {stats.planningTomorrow.length === 0 ? (
                  <p className="text-sm text-muted">Aucune séance prévue.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {stats.planningTomorrow.map((seance, idx) => (
                      <li key={`tm-${idx}`} className="flex justify-between items-center text-sm p-2 rounded-md" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <span className="font-medium text-muted">{seance.nom}</span>
                        <span className="text-xs text-muted">{seance.heure}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </motion.div>

          {/* GRAPHIQUES D'ANALYSE */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* PHASE 4: COURBE DE FRÉQUENTATION DÉTAILLÉE PAR GROUPE */}
            <Card className="p-5 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold mb-0" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} color="var(--accent-secondary)" />
                    Assiduité par type de groupe
                  </h3>
                  <span className="text-xs text-muted">Répartition des passages (Initiation, Apprentissage, Élite)</span>
                </div>
              </div>

              {stats.dailyPresenceTrend && stats.dailyPresenceTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={stats.dailyPresenceTrend} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorInit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorAppr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorElite" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '0.85rem' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                    <Area type="monotone" name="Initiation" dataKey="Initiation" stackId="1" stroke="#10b981" strokeWidth={2} fill="url(#colorInit)" />
                    <Area type="monotone" name="Apprentissage" dataKey="Apprentissage" stackId="1" stroke="#3b82f6" strokeWidth={2} fill="url(#colorAppr)" />
                    <Area type="monotone" name="Élite / Perf" dataKey="ElitePerf" stackId="1" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorElite)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted text-sm">Données en cours de synchronisation...</div>
              )}
            </Card>

            {/* JAUGE DE REMPLISSAGE */}
            <Card className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold mb-0">Remplissage Groupes</h3>
                  <span className="text-xs text-muted">Taux d'occupation global : {stats.globalFillRate}%</span>
                </div>
              </div>
              <div className="flex flex-col gap-3.5 mt-2 overflow-y-auto pr-1" style={{ maxHeight: '250px' }}>
                {stats.groupCapacityStats.map(g => (
                  <div key={g.id} className="p-2.5 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <div className="flex justify-between items-center text-xs mb-1.5">
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{g.nom}</span>
                      <span style={{ fontWeight: 800, color: g.fillRate >= 90 ? '#ef4444' : g.fillRate >= 70 ? '#f59e0b' : '#10b981' }}>
                        {g.count}/{g.max} ({g.fillRate}%)
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${g.fillRate}%`, 
                        backgroundColor: g.fillRate >= 90 ? '#ef4444' : g.fillRate >= 70 ? '#f59e0b' : '#10b981',
                        borderRadius: '3px'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>

          {/* TABLEAUX DES ADHÉRENTS */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-5 lg:col-span-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <div>
                  <h3 className="text-base font-bold mb-0">Adhérents du Club ({filteredInscrits.length})</h3>
                  <span className="text-xs text-muted">Filtres dynamiques et actions rapides</span>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    placeholder="🔍 Nom..."
                    value={inscritsSearch}
                    onChange={(e) => setInscritsSearch(e.target.value)}
                    className="form-input"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', width: '150px' }}
                  />
                  <select
                    value={inscritsFilterStatus}
                    onChange={(e) => setInscritsFilterStatus(e.target.value)}
                    className="form-select"
                    style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', width: '130px' }}
                  >
                    <option value="ALL">Tous statuts</option>
                    <option value="ACTIVE">✅ À jour</option>
                    <option value="SUSPENDED">❌ Suspendu</option>
                  </select>
                </div>
              </div>

              <div className="table-responsive">
                <table style={{ minWidth: '800px' }}>
                  <thead>
                    <tr>
                      <th>Adhérent</th>
                      <th>Catégorie</th>
                      <th>Groupe</th>
                      <th>Expiration</th>
                      <th>Statut</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInscrits.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center text-muted" style={{ padding: '2rem 0' }}>
                          Aucun athlète ne correspond aux filtres.
                        </td>
                      </tr>
                    ) : (
                      filteredInscrits.slice(0, 15).map(athlete => {
                        const statut = athlete.cartes_acces?.statut || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut);
                        const age = calculateAge(athlete.date_naissance);
                        
                        // Phase 4: Mise en évidence visuelle des suspendus
                        const rowStyle = statut !== 'ACTIVE' 
                          ? { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)' } 
                          : {};

                        return (
                          <tr key={athlete.id} style={rowStyle}>
                            <td style={{ fontWeight: 600 }}>
                              <Link to={`/athletes/${athlete.id}`} style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                                {athlete.nom} {athlete.prenom}
                              </Link>
                            </td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {age ? `${age} ans` : '-'}
                            </td>
                            <td>{athlete.groupes?.nom || athlete.groupe || '-'}</td>
                            <td style={{ fontSize: '0.8rem', color: statut !== 'ACTIVE' ? '#ef4444' : 'var(--text-secondary)' }}>
                              {athlete.cotisations && athlete.cotisations.length > 0
                                ? new Date(Math.max(...athlete.cotisations.map(c => new Date(c.periode_couverte_fin).getTime()))).toLocaleDateString('fr-FR')
                                : '-'}
                            </td>
                            <td>
                              <Badge status={statut}>
                                {statut === 'ACTIVE' ? 'À jour' : 'Suspendu'}
                              </Badge>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <Link to={`/finances?search=${encodeURIComponent(athlete.nom)}`} style={{ textDecoration: 'none', marginRight: '6px' }}>
                                <button className="btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}>
                                  <DollarSign size={14} />
                                </button>
                              </Link>
                              <Link to={`/athletes/edit/${athlete.id}`} style={{ textDecoration: 'none' }}>
                                <button className="btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}>
                                  Voir
                                </button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
