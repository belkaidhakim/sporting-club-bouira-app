import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, CreditCard, ScanLine, DollarSign, Clock, UserX, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Card, StatCard, Button, Badge, Skeleton } from '../components/ui';
import toast from 'react-hot-toast';

const JOURS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
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
    recent: [],
    recentPresences: []
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('presences'); // 'presences' | 'absents'
  const [presenceFilter, setPresenceFilter] = useState('today'); // 'today', 'week', 'month', 'all'
  const [presenceSearch, setPresenceSearch] = useState('');

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('athletes')
          .select(`*, cartes_acces(statut), cotisations(periode_couverte_fin), groupes(nom, horaires)`)
          .eq('est_actif', true)
          .order('date_inscription', { ascending: false });

        if (error) throw error;

        let active = 0;
        let suspended = 0;
        
        data?.forEach(athlete => {
          const statut = athlete.cartes_acces?.statut || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut);
          if (statut === 'ACTIVE') {
            active++;
          } else {
            suspended++;
          }
        });

        // Date de début d'aujourd'hui (00:00:00)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        // Récupérer tous les scans d'aujourd'hui pour compter les présences uniques
        const { data: todayScans } = await supabase
          .from('presences')
          .select('athlete_id')
          .gte('date_scan', todayStart.toISOString());

        const todayScansSet = new Set(todayScans?.map(p => p.athlete_id) || []);
        const uniqueTodayAthletes = todayScansSet.size;

        // Calcul du suivi des absences du jour selon le planning
        const todayDayName = JOURS_FR[new Date().getDay()];
        const expectedTodayList = [];
        const absentTodayList = [];

        data?.forEach(athlete => {
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

        // Récupérer l'historique récent des présences
        const { data: presencesData, error: presencesError } = await supabase
          .from('presences')
          .select(`id, date_scan, athlete_id, athletes (nom, prenom, groupe, groupes(nom, horaires))`)
          .order('date_scan', { ascending: false })
          .limit(50);

        if (presencesError) {
          toast.error("Erreur Dashboard Présences: " + presencesError.message);
        }

        setStats({
          total: data?.length || 0,
          active,
          suspended,
          todayPresences: uniqueTodayAthletes,
          expectedToday: expectedTodayList.length,
          absentTodayList,
          recent: data?.slice(0, 5) || [],
          recentPresences: presencesData || []
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Filtrage des présences
  const filteredPresences = stats.recentPresences.filter(presence => {
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

  // Filtrage de la liste des absents
  const filteredAbsents = stats.absentTodayList.filter(athlete => {
    if (presenceSearch) {
      const q = presenceSearch.toLowerCase();
      const nom = (athlete.nom || '').toLowerCase();
      const prenom = (athlete.prenom || '').toLowerCase();
      const groupe = (athlete.groupes?.nom || athlete.groupe || '').toLowerCase();
      return nom.includes(q) || prenom.includes(q) || groupe.includes(q);
    }
    return true;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1>Tableau de bord</h1>
          <p style={{ marginBottom: 0 }}>Vue d'ensemble de l'activité, assiduité et contrôle des pointages.</p>
        </div>
        <Link to="/athletes/new" style={{ textDecoration: 'none' }}>
          <Button variant="primary">
            + Nouvel Athlète
          </Button>
        </Link>
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
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={<Users size={20} />}
              iconBg="rgba(99, 102, 241, 0.1)"
              iconColor="var(--accent-primary)"
              glowColor="rgba(99, 102, 241, 0.15)"
              label="Total Athlètes"
              value={stats.total}
            />
            <StatCard
              icon={<ScanLine size={20} />}
              iconBg="rgba(34, 211, 238, 0.1)"
              iconColor="var(--accent-secondary)"
              glowColor="rgba(34, 211, 238, 0.15)"
              label="Présences Aujourd'hui"
              value={`${stats.todayPresences} pointages`}
              subtitle={stats.expectedToday > 0 ? `${stats.todayPresences} sur ${stats.expectedToday} attendus aujourd'hui` : `Sur ${stats.active} cotisations actives`}
            />
            <StatCard
              icon={<UserX size={20} />}
              iconBg="rgba(245, 158, 11, 0.1)"
              iconColor="var(--accent-warning)"
              glowColor="rgba(245, 158, 11, 0.15)"
              label="Absents du Jour (Planning)"
              value={`${stats.absentTodayList.length} absents`}
              subtitle={stats.expectedToday > 0 ? `Sur ${stats.expectedToday} athlètes programmés` : 'Aucune séance prévue ce jour'}
            />
            <StatCard
              icon={<CreditCard size={20} />}
              iconBg="rgba(16, 185, 129, 0.1)"
              iconColor="var(--accent-success)"
              glowColor="rgba(16, 185, 129, 0.15)"
              label="Cotisations à jour"
              value={stats.active}
              subtitle={`Sur ${stats.total} athlètes inscrits`}
            />
          </motion.div>

          <motion.div variants={itemVariants} className="mt-8 grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
            <Card>
              <h3 className="mb-4" style={{ fontSize: '1rem' }}>Derniers Inscrits</h3>
              <div className="table-responsive">
              <table style={{ minWidth: '500px' }}>
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Groupe</th>
                    <th>Fin Cotisation</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center text-muted" style={{ padding: '2rem 0' }}>Aucun inscrit pour le moment.</td>
                    </tr>
                  ) : (
                    stats.recent.map(athlete => {
                      const statut = athlete.cartes_acces?.statut || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut);
                      return (
                        <tr key={athlete.id}>
                          <td style={{ fontWeight: 500 }}>{athlete.nom} {athlete.prenom}</td>
                          <td>{athlete.groupes?.nom || athlete.groupe || '-'}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {athlete.cotisations && athlete.cotisations.length > 0
                              ? new Date(Math.max(...athlete.cotisations.map(c => new Date(c.periode_couverte_fin).getTime()))).toLocaleDateString('fr-FR')
                              : '-'}
                          </td>
                          <td>
                            <Badge status={statut}>
                              {statut === 'ACTIVE' ? 'Active' : 'Suspendue'}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
              </div>
            </Card>

            <Card>
              <h3 className="mb-4" style={{ fontSize: '1rem' }}>Actions Rapides</h3>
              <div className="flex flex-col gap-3">
                <Link to="/scanner" target="_blank" style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" className="w-full" style={{ justifyContent: 'flex-start', padding: '0.875rem 1rem' }}>
                    <ScanLine size={16} className="text-accent" /> Lancer le Scanner QR
                  </Button>
                </Link>
                <Link to="/finances" style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" className="w-full" style={{ justifyContent: 'flex-start', padding: '0.875rem 1rem' }}>
                    <DollarSign size={16} className="text-success" /> Gérer les Paiements
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="md:col-span-2">
              <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
                <div className="flex items-center gap-2">
                  {/* Bascule Mode Présences / Absents */}
                  <div className="flex gap-1" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
                    <button 
                      onClick={() => setViewMode('presences')} 
                      className={`tab-btn ${viewMode === 'presences' ? 'active' : ''}`}
                      style={{ padding: '4px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Clock size={14} />
                      Pointages enregistrés
                    </button>
                    <button 
                      onClick={() => setViewMode('absents')} 
                      className={`tab-btn ${viewMode === 'absents' ? 'active' : ''}`}
                      style={{ padding: '4px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <UserX size={14} />
                      Absents du jour ({stats.absentTodayList.length})
                    </button>
                  </div>
                </div>

                {/* Filtres de Période & Recherche */}
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    placeholder="Filtrer nom ou groupe..."
                    value={presenceSearch}
                    onChange={e => setPresenceSearch(e.target.value)}
                    className="form-input"
                    style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', width: '170px' }}
                  />

                  {viewMode === 'presences' && (
                    <div className="flex gap-1" style={{ backgroundColor: 'var(--bg-tertiary)', padding: '2px', borderRadius: 'var(--radius-full)' }}>
                      <button 
                        onClick={() => setPresenceFilter('today')} 
                        className={`tab-btn ${presenceFilter === 'today' ? 'active' : ''}`}
                        style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                      >
                        Aujourd'hui
                      </button>
                      <button 
                        onClick={() => setPresenceFilter('week')} 
                        className={`tab-btn ${presenceFilter === 'week' ? 'active' : ''}`}
                        style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                      >
                        7j
                      </button>
                      <button 
                        onClick={() => setPresenceFilter('month')} 
                        className={`tab-btn ${presenceFilter === 'month' ? 'active' : ''}`}
                        style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                      >
                        Mois
                      </button>
                      <button 
                        onClick={() => setPresenceFilter('all')} 
                        className={`tab-btn ${presenceFilter === 'all' ? 'active' : ''}`}
                        style={{ padding: '3px 10px', fontSize: '0.75rem' }}
                      >
                        Tous
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* TABLEAU 1: POINTAGES ENREGISTRÉS */}
              {viewMode === 'presences' ? (
                <div className="table-responsive">
                  <table style={{ minWidth: '550px' }}>
                    <thead>
                      <tr>
                        <th>Date & Heure Scan</th>
                        <th>Athlète</th>
                        <th>Groupe</th>
                        <th>Planning d'entraînement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPresences.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center text-muted" style={{ padding: '2rem 0' }}>Aucun pointage trouvé pour ces critères.</td>
                        </tr>
                      ) : (
                        filteredPresences.map(presence => {
                          const planning = parseHoraires(presence.athletes?.groupes?.horaires);
                          const scanDate = new Date(presence.date_scan);
                          const isToday = scanDate.toDateString() === new Date().toDateString();

                          return (
                            <tr key={presence.id}>
                              <td style={{ fontWeight: 500, color: isToday ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                                <span style={{ fontSize: '0.75rem', opacity: 0.8, marginRight: '6px' }}>
                                  {scanDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                </span>
                                {scanDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' })}
                              </td>
                              <td style={{ fontWeight: 600 }}>
                                {presence.athletes?.nom} {presence.athletes?.prenom}
                              </td>
                              <td>
                                <Badge status="ACTIVE">{presence.athletes?.groupes?.nom || presence.athletes?.groupe || '-'}</Badge>
                              </td>
                              <td>
                                {planning.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {planning.map((s, i) => (
                                      <span key={i} style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        padding: '2px 8px',
                                        borderRadius: 'var(--radius-full)',
                                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                                        color: 'var(--accent-primary-hover)',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        fontFamily: 'Outfit'
                                      }}>
                                        <Clock size={10} />
                                        {s.jour} {s.heure}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* TABLEAU 2: ABSENTS DU JOUR SELON LE PLANNING */
                <div className="table-responsive">
                  <table style={{ minWidth: '550px' }}>
                    <thead>
                      <tr>
                        <th>Athlète Absent</th>
                        <th>Groupe</th>
                        <th>Séance Prévue</th>
                        <th>Contact / Téléphone</th>
                        <th>Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAbsents.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center text-success" style={{ padding: '2rem 0', fontWeight: 600 }}>
                            🎉 Aucun absent ! Tous les athlètes programmés ont pointé leur badge aujourd'hui.
                          </td>
                        </tr>
                      ) : (
                        filteredAbsents.map(athlete => (
                          <tr key={athlete.id}>
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {athlete.nom?.toUpperCase()} {athlete.prenom}
                            </td>
                            <td>
                              <Badge status="ACTIVE">{athlete.groupes?.nom || athlete.groupe || '-'}</Badge>
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--accent-warning)' }}>
                              <span className="flex items-center gap-1">
                                <Clock size={13} />
                                {JOURS_FR[new Date().getDay()]} à {athlete.heureSeance}
                              </span>
                            </td>
                            <td>
                              {athlete.telephone ? (
                                <a 
                                  href={`tel:${athlete.telephone}`}
                                  style={{ 
                                    textDecoration: 'none', 
                                    color: 'var(--accent-secondary)', 
                                    fontWeight: 600, 
                                    fontSize: '0.8rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                >
                                  <Phone size={12} />
                                  {athlete.telephone}
                                </a>
                              ) : (
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Non renseigné</span>
                              )}
                            </td>
                            <td>
                              <Badge status="SUSPENDUE">ABSENT</Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
