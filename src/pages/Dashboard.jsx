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
  Activity
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
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    todayPresences: 0,
    expectedToday: 0,
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
    revenueBreakdown: []
  });

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('presences'); // 'presences' | 'absents'
  const [presenceFilter, setPresenceFilter] = useState('today'); // 'today', 'week', 'month', 'all'
  const [presenceSearch, setPresenceSearch] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState(null);

  // Filtres dynamiques sur la liste des inscrits
  const [inscritsFilterGroup, setInscritsFilterGroup] = useState('ALL');
  const [inscritsFilterStatus, setInscritsFilterStatus] = useState('ALL');
  const [inscritsSearch, setInscritsSearch] = useState('');

  // Validation manuelle de la présence pour un absent
  const handleManualPresence = async (athlete) => {
    try {
      const { error } = await supabase
        .from('presences')
        .insert([{ athlete_id: athlete.id }]);

      if (error && error.code !== '23505') throw error;

      toast.success(`Présence validée manuellement pour ${athlete.nom} ${athlete.prenom} !`);

      setStats(prev => ({
        ...prev,
        todayPresences: prev.todayPresences + 1,
        absentTodayList: prev.absentTodayList.filter(a => a.id !== athlete.id),
        recentPresences: [
          {
            id: `manual-${Date.now()}`,
            date_scan: new Date().toISOString(),
            athlete_id: athlete.id,
            athletes: {
              nom: athlete.nom,
              prenom: athlete.prenom,
              groupe: athlete.groupe,
              groupes: athlete.groupes
            }
          },
          ...prev.recentPresences
        ]
      }));
    } catch (err) {
      console.error('Erreur validation manuelle:', err);
      toast.error('Erreur lors du pointage: ' + (err.message || ''));
    }
  };

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        const { data: athletesData, error: athletesError } = await supabase
          .from('athletes')
          .select(`*, cartes_acces(statut, date_dernier_paiement), cotisations(montant_paye, date_paiement, periode_couverte_fin), groupes(id, nom, horaires)`)
          .eq('est_actif', true)
          .order('date_inscription', { ascending: false });

        if (athletesError) throw athletesError;

        let active = 0;
        let suspended = 0;
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
        const expectedTodayList = [];
        const absentTodayList = [];

        (athletesData || []).forEach(athlete => {
          const groupHoraires = parseHoraires(athlete.groupes?.horaires);
          const hasSessionToday = groupHoraires.some(h => h.jour === todayDayName);

          if (hasSessionToday) {
            expectedTodayList.push(athlete);
            if (!todayScansSet.has(athlete.id)) {
              const sessionToday = groupHoraires.find(h => h.jour === todayDayName);
              absentTodayList.push({
                ...athlete,
                heureSeance: sessionToday ? sessionToday.heure : '-'
              });
            }
          }
        });

        // Historique récent des 60 présences
        const { data: presencesData } = await supabase
          .from('presences')
          .select(`id, date_scan, athlete_id, athletes (nom, prenom, groupe, groupes(nom, horaires))`)
          .order('date_scan', { ascending: false })
          .limit(60);

        // Calcul de la tendance journalière des 7 derniers jours
        const dailyTrendMap = {};
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
          const dateStr = d.toISOString().split('T')[0];
          dailyTrendMap[dateStr] = { name: key, presences: 0, date: dateStr };
        }

        // Récupérer les scans des 7 derniers jours pour le graphique
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const { data: weekScans } = await supabase
          .from('presences')
          .select('date_scan, athlete_id')
          .gte('date_scan', sevenDaysAgo.toISOString());

        (weekScans || []).forEach(scan => {
          const dateStr = scan.date_scan.split('T')[0];
          if (dailyTrendMap[dateStr]) {
            dailyTrendMap[dateStr].presences += 1;
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
          dailyPresenceTrend
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  // Filtrage des présences
  const filteredPresences = useMemo(() => {
    return (stats.recentPresences || []).filter(presence => {
      const scanDate = new Date(presence.date_scan);

      if (presenceFilter === 'today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        if (scanDate < todayStart) return false;
      } else if (presenceFilter === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        if (scanDate < weekAgo) return false;
      } else if (presenceFilter === 'month') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        if (scanDate < monthAgo) return false;
      }

      if (presenceSearch) {
        const q = presenceSearch.toLowerCase();
        const nom = (presence.athletes?.nom || '').toLowerCase();
        const prenom = (presence.athletes?.prenom || '').toLowerCase();
        const groupe = (presence.athletes?.groupes?.nom || presence.athletes?.groupe || '').toLowerCase();
        return nom.includes(q) || prenom.includes(q) || groupe.includes(q);
      }

      return true;
    });
  }, [stats.recentPresences, presenceFilter, presenceSearch]);

  // Filtrage de la liste des absents
  const filteredAbsents = useMemo(() => {
    return (stats.absentTodayList || []).filter(athlete => {
      if (presenceSearch) {
        const q = presenceSearch.toLowerCase();
        const nom = (athlete.nom || '').toLowerCase();
        const prenom = (athlete.prenom || '').toLowerCase();
        const groupe = (athlete.groupes?.nom || athlete.groupe || '').toLowerCase();
        return nom.includes(q) || prenom.includes(q) || groupe.includes(q);
      }
      return true;
    });
  }, [stats.absentTodayList, presenceSearch]);

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

  return (
    <div>
      {/* HEADER DU DASHBOARD */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <div>
          <h1>Tableau de bord de Gestion</h1>
          <p style={{ marginBottom: 0 }}>Supervision de l'activité, assiduité aux bassins et actions requises.</p>
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
              subtitle={stats.expectedToday > 0 ? `${stats.todayPresences} sur ${stats.expectedToday} attendus aujourd'hui` : `Sur ${stats.active} cotisations actives`}
            />
            <StatCard
              icon={<UserX size={20} />}
              iconBg="rgba(245, 158, 11, 0.1)"
              iconColor="var(--accent-warning)"
              glowColor="rgba(245, 158, 11, 0.15)"
              label="Absents Programmés"
              value={`${stats.absentTodayList.length} absent(s)`}
              subtitle={stats.expectedToday > 0 ? `Sur ${stats.expectedToday} athlètes programmés` : 'Aucune séance prévue ce jour'}
            />
            <StatCard
              icon={<CreditCard size={20} />}
              iconBg="rgba(16, 185, 129, 0.1)"
              iconColor="var(--accent-success)"
              glowColor="rgba(16, 185, 129, 0.15)"
              label="Cotisations à Jour"
              value={stats.active}
              subtitle={`${stats.suspended} expirée(s) ou en attente`}
            />
          </motion.div>

          {/* CENTRE D'ALERTES : ACTIONS REQUISES (PHASE 1) */}
          {(stats.expiredList.length > 0 || stats.expiringSoon.length > 0 || stats.incompleteFiles.length > 0) && (
            <motion.div variants={itemVariants} className="mb-8">
              <Card className="p-5" style={{ backgroundColor: 'rgba(239, 68, 68, 0.06)', border: '1.5px solid rgba(239, 68, 68, 0.3)', borderRadius: '16px' }}>
                <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                  <div className="flex items-center gap-2.5">
                    <div style={{ padding: '7px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
                      <AlertOctagon size={22} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold mb-0" style={{ color: '#f87171' }}>
                        🚨 Centre d'Alertes · Actions Requises
                      </h3>
                      <span className="text-xs text-muted">
                        Cotisations à régulariser et conformité des dossiers médicaux
                      </span>
                    </div>
                  </div>
                  <Link to="/finances" style={{ textDecoration: 'none' }}>
                    <Button variant="secondary" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                      Accéder aux Finances →
                    </Button>
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* ALERTE 1 : COTISATIONS EXPIRÉES */}
                  <div className="p-4 rounded-xl flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f87171' }}>
                          ❌ Cotisations Expirées ({stats.expiredList.length})
                        </span>
                        <Badge status="SUSPENDED">Bloqué</Badge>
                      </div>
                      <p className="text-xs text-muted mb-3">
                        Athlètes dont l'accès bassin est actuellement suspendu.
                      </p>
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                        {stats.expiredList.slice(0, 4).map(athlete => {
                          const wpPhone = formatWhatsAppPhone(athlete.telephone || athlete.telephone_tuteur);
                          return (
                            <div key={athlete.id} className="flex justify-between items-center p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                              <div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{athlete.nom} {athlete.prenom}</span>
                                <div style={{ fontSize: '0.7rem', color: '#f87171' }}>Expiré ({athlete.endDateStr})</div>
                              </div>
                              <div className="flex items-center gap-1">
                                {wpPhone && (
                                  <a
                                    href={`https://wa.me/${wpPhone}?text=${encodeURIComponent(`Bonjour ${athlete.prenom}, le Sporting Club Bouira vous informe que votre adhésion/cotisation a expiré le ${athlete.endDateStr}. Merci de vous rapprocher de l'administration pour le renouvellement.`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ padding: '4px 6px', borderRadius: '6px', backgroundColor: 'rgba(37, 211, 102, 0.15)', color: '#25D366', display: 'flex', alignItems: 'center' }}
                                    title="Relance WhatsApp 1-clic"
                                  >
                                    <MessageCircle size={14} />
                                  </a>
                                )}
                                <Link to={`/finances?search=${encodeURIComponent(athlete.nom)}`} style={{ textDecoration: 'none' }}>
                                  <button style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'none', cursor: 'pointer' }}>
                                    Payer
                                  </button>
                                </Link>
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
                          ⏳ Renouvellements Imminents ({stats.expiringSoon.length})
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#f59e0b', backgroundColor: 'rgba(245, 158, 11, 0.15)', padding: '2px 8px', borderRadius: '9999px' }}>
                          &lt; 7 jours
                        </span>
                      </div>
                      <p className="text-xs text-muted mb-3">
                        À relancer avant suspension automatique de la carte.
                      </p>
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                        {stats.expiringSoon.slice(0, 4).map(athlete => {
                          const wpPhone = formatWhatsAppPhone(athlete.telephone || athlete.telephone_tuteur);
                          return (
                            <div key={athlete.id} className="flex justify-between items-center p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                              <div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{athlete.nom} {athlete.prenom}</span>
                                <div style={{ fontSize: '0.7rem', color: '#f59e0b' }}>Dans {athlete.daysLeft}j ({athlete.endDateStr})</div>
                              </div>
                              <div className="flex items-center gap-1">
                                {wpPhone && (
                                  <a
                                    href={`https://wa.me/${wpPhone}?text=${encodeURIComponent(`Bonjour ${athlete.prenom}, votre cotisation au Sporting Club Bouira expire dans ${athlete.daysLeft} jour(s) (${athlete.endDateStr}). Pensez à renouveler pour conserver votre accès fluide au bassin.`)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ padding: '4px 6px', borderRadius: '6px', backgroundColor: 'rgba(37, 211, 102, 0.15)', color: '#25D366', display: 'flex', alignItems: 'center' }}
                                    title="Rappel préventif WhatsApp"
                                  >
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

                  {/* ALERTE 3 : DOSSIERS INCOMPLETS (SANS CERTIFICAT MÉDICAL) */}
                  <div className="p-4 rounded-xl flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#818cf8' }}>
                          📄 Dossiers Médicaux Incomplets ({stats.incompleteFiles.length})
                        </span>
                        <HeartPulse size={16} color="#818cf8" />
                      </div>
                      <p className="text-xs text-muted mb-3">
                        Certificat médical ou photo manquante (obligatoire en natation).
                      </p>
                      <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                        {stats.incompleteFiles.slice(0, 5).map(athlete => {
                          const wpPhone = formatWhatsAppPhone(athlete.telephone || athlete.telephone_tuteur);
                          const docType = athlete.missingCertif ? 'certificat médical d\'aptitude' : 'photo d\'identité';
                          const msgRelance = `Bonjour ${athlete.prenom}, votre dossier au Sporting Club Bouira est incomplet (${docType} manquant). Ce document est indispensable pour l'accès aux bassins. Merci de le transmettre au club dès que possible.`;

                          return (
                            <div key={athlete.id} className="flex justify-between items-center p-2 rounded-lg text-xs" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                              <div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{athlete.nom} {athlete.prenom}</span>
                                <div style={{ fontSize: '0.7rem', color: '#818cf8' }}>
                                  {athlete.missingCertif ? '❌ Sans Certificat' : '❌ Sans Photo'}
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                {wpPhone && (
                                  <a
                                    href={`https://wa.me/${wpPhone}?text=${encodeURIComponent(msgRelance)}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ padding: '4px 6px', borderRadius: '6px', backgroundColor: 'rgba(37, 211, 102, 0.15)', color: '#25D366', display: 'flex', alignItems: 'center' }}
                                    title="Relancer par WhatsApp"
                                  >
                                    <MessageCircle size={13} />
                                  </a>
                                )}
                                <Link to={`/athletes/edit/${athlete.id}`} style={{ textDecoration: 'none' }}>
                                  <button style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: 'none', cursor: 'pointer' }}>
                                    Compléter
                                  </button>
                                </Link>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {/* GRAPHIQUES D'ANALYSE (PHASE 1) */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* COURBE DE FRÉQUENTATION HEBDOMADAIRE (RECHARTS) */}
            <Card className="p-5 lg:col-span-2">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold mb-0" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={18} color="var(--accent-secondary)" />
                    Fréquentation & Assiduité aux Bassins
                  </h3>
                  <span className="text-xs text-muted">Évolution des passages et scans journaliers</span>
                </div>
                <div style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: 'rgba(34, 211, 238, 0.1)', color: 'var(--accent-secondary)', fontSize: '0.75rem', fontWeight: 700 }}>
                  7 Derniers Jours
                </div>
              </div>

              {stats.dailyPresenceTrend && stats.dailyPresenceTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={stats.dailyPresenceTrend} margin={{ top: 10, right: 15, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="presenceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-secondary)" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="var(--accent-secondary)" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '10px',
                        fontSize: '0.85rem'
                      }}
                      formatter={(val) => [`${val} passage(s)`, 'Présences']}
                    />
                    <Area type="monotone" dataKey="presences" stroke="var(--accent-secondary)" strokeWidth={3} fillOpacity={1} fill="url(#presenceGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-48 text-muted text-sm">Données en cours de synchronisation...</div>
              )}
            </Card>

            {/* JAUGE DE REMPLISSAGE PAR SECTION AQUATIQUE */}
            <Card className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold mb-0">Remplissage des Groupes</h3>
                  <span className="text-xs text-muted">Capacité globale : {stats.globalFillRate}%</span>
                </div>
              </div>

              <div className="flex flex-col gap-3.5 mt-2">
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

          {/* TABLEAUX AVEC FILTRES DYNAMIQUES (PHASE 1) */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* DERNIERS INSCRITS AVEC FILTRES INSTANTANÉS */}
            <Card className="p-5 lg:col-span-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                <div>
                  <h3 className="text-base font-bold mb-0">Adhérents du Club ({filteredInscrits.length})</h3>
                  <span className="text-xs text-muted">Filtres dynamiques par groupe et statut</span>
                </div>
                {/* FILTRES EN 1 CLIC SANS RECHARGER */}
                <div className="flex flex-wrap gap-2 items-center">
                  <input
                    type="text"
                    placeholder="🔍 Filtrer par nom..."
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
                <table style={{ minWidth: '550px' }}>
                  <thead>
                    <tr>
                      <th>Adhérent</th>
                      <th>Catégorie</th>
                      <th>Groupe</th>
                      <th>Cotisation</th>
                      <th>Statut</th>
                      <th style={{ textAlign: 'right' }}>Badge</th>
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
                      filteredInscrits.slice(0, 8).map(athlete => {
                        const statut = athlete.cartes_acces?.statut || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut);
                        const age = calculateAge(athlete.date_naissance);
                        return (
                          <tr key={athlete.id}>
                            <td style={{ fontWeight: 600 }}>
                              {athlete.nom} {athlete.prenom}
                            </td>
                            <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {age ? `${age} ans` : '-'}
                            </td>
                            <td>{athlete.groupes?.nom || athlete.groupe || '-'}</td>
                            <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
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
                              <button 
                                className="btn-secondary" 
                                style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', borderRadius: '6px' }}
                                onClick={() => setSelectedAthlete(athlete)}
                              >
                                <QrCode size={14} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* JOURNAL DES POINTAGES BASSIN */}
            <Card className="p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-base font-bold mb-0">Pointages Récents</h3>
                  <span className="text-xs text-muted">Contrôles en temps réel</span>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setViewMode('presences')} 
                    style={{ 
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      backgroundColor: viewMode === 'presences' ? 'var(--accent-secondary)' : 'transparent',
                      color: viewMode === 'presences' ? '#000' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Présents ({stats.todayPresences})
                  </button>
                  <button 
                    onClick={() => setViewMode('absents')} 
                    style={{ 
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      fontSize: '0.75rem', 
                      fontWeight: 700, 
                      backgroundColor: viewMode === 'absents' ? 'var(--accent-warning)' : 'transparent',
                      color: viewMode === 'absents' ? '#000' : 'var(--text-muted)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Absents ({stats.absentTodayList.length})
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
                {viewMode === 'presences' ? (
                  filteredPresences.length === 0 ? (
                    <div className="text-center text-muted text-xs py-8">Aucun scan récent.</div>
                  ) : (
                    filteredPresences.slice(0, 8).map(p => (
                      <div key={p.id} className="p-2.5 rounded-lg flex justify-between items-center text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{p.athletes?.nom} {p.athletes?.prenom}</strong>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{p.athletes?.groupes?.nom || p.athletes?.groupe || '-'}</span>
                        </div>
                        <span style={{ color: 'var(--accent-secondary)', fontWeight: 700, fontSize: '0.75rem' }}>
                          {new Date(p.date_scan).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )
                ) : (
                  filteredAbsents.length === 0 ? (
                    <div className="text-center text-muted text-xs py-8">Tous les athlètes attendus sont présents ! 🎉</div>
                  ) : (
                    filteredAbsents.slice(0, 8).map(a => (
                      <div key={a.id} className="p-2.5 rounded-lg flex justify-between items-center text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <div>
                          <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{a.nom} {a.prenom}</strong>
                          <span style={{ color: '#f59e0b', fontSize: '0.7rem' }}>Séance : {a.heureSeance}</span>
                        </div>
                        <button 
                          onClick={() => handleManualPresence(a)}
                          style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: 'none', cursor: 'pointer' }}
                        >
                          Valider
                        </button>
                      </div>
                    ))
                  )
                )}
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* MODALE D'APERÇU DU BADGE */}
      {selectedAthlete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', maxWidth: '400px', width: '100%', position: 'relative' }}>
            <button 
              onClick={() => setSelectedAthlete(null)}
              style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 className="mb-4 text-center">Badge d'Accès Officiel</h3>
            <BadgeGenerator athlete={selectedAthlete} showEndDate={true} />
          </div>
        </div>
      )}
    </div>
  );
}
