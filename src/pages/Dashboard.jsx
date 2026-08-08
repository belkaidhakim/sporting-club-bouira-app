import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, CreditCard, ScanLine, DollarSign, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Card, StatCard, Button, Badge, Skeleton } from '../components/ui';
import toast from 'react-hot-toast';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
};

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    recent: [],
    recentPresences: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('athletes')
          .select(`*, cartes_acces(statut), cotisations(periode_couverte_fin), groupes(nom)`)
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

        const { data: presencesData, error: presencesError } = await supabase
          .from('presences')
          .select(`id, date_scan, athletes (nom, prenom, groupe, groupes(nom))`)
          .order('date_scan', { ascending: false })
          .limit(10);

        if (presencesError) {
          toast.error("Erreur Dashboard Présences: " + presencesError.message);
        }

        setStats({
          total: data?.length || 0,
          active,
          suspended,
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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1>Tableau de bord</h1>
          <p style={{ marginBottom: 0 }}>Vue d'ensemble de l'activité de votre club.</p>
        </div>
        <Link to="/athletes/new" style={{ textDecoration: 'none' }}>
          <Button variant="primary">
            + Nouvel Athlète
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              icon={<Users size={20} />}
              iconBg="rgba(99, 102, 241, 0.1)"
              iconColor="var(--accent-primary)"
              glowColor="rgba(99, 102, 241, 0.15)"
              label="Total Athlètes"
              value={stats.total}
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
            <StatCard
              icon={<AlertTriangle size={20} />}
              iconBg="rgba(244, 63, 94, 0.1)"
              iconColor="var(--accent-danger)"
              glowColor="rgba(244, 63, 94, 0.15)"
              label="Impayés / Expirés"
              value={stats.suspended}
              subtitle={stats.suspended > 0 ? 'Action requise' : 'Tout est en ordre ✓'}
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
              <h3 className="mb-4 flex items-center gap-2" style={{ fontSize: '1rem' }}>
                <Clock size={18} className="text-accent" /> Dernières Présences
              </h3>
              <div className="table-responsive">
              <table style={{ minWidth: '400px' }}>
                <thead>
                  <tr>
                    <th>Heure</th>
                    <th>Athlète</th>
                    <th>Groupe</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPresences.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="text-center text-muted" style={{ padding: '2rem 0' }}>Aucun scan récent enregistré.</td>
                    </tr>
                  ) : (
                    stats.recentPresences.map(presence => (
                      <tr key={presence.id}>
                        <td style={{ fontWeight: 500, color: 'var(--accent-success)' }}>
                          {new Date(presence.date_scan).toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' })}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {presence.athletes?.nom} {presence.athletes?.prenom}
                        </td>
                        <td>
                          <Badge status="ACTIVE">{presence.athletes?.groupes?.nom || presence.athletes?.groupe || '-'}</Badge>
                        </td>
                      </tr>
                    ))
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
