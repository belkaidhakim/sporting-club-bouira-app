import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, TrendingUp, CreditCard, ScanLine, DollarSign, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import { Card, Button, Badge, Skeleton } from '../components/ui';
import toast from 'react-hot-toast';

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
        // Fetch athletes with their cartes_acces
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
          <p>Bienvenue sur l'interface d'administration de votre club.</p>
        </div>
        <Link to="/athletes/new" style={{ textDecoration: 'none' }}>
          <Button variant="primary">
            + Nouvel Athlète
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 mt-4 gap-6">
          <Skeleton height="120px" />
          <Skeleton height="120px" />
          <Skeleton height="120px" />
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ staggerChildren: 0.1 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 mt-4" style={{ gap: '1.5rem' }}>
            <Card className="flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-muted mb-0">Total Athlètes</h3>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-primary)' }}>
                  <Users size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>{stats.total}</div>
            </Card>

            <Card className="flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-muted mb-0">Cotisations à jour</h3>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)' }}>
                  <CreditCard size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>{stats.active}</div>
              <div className="text-sm text-muted">Sur {stats.total} athlètes inscrits</div>
            </Card>

            <Card className="flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-muted mb-0">Impayés / Expirés</h3>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-danger)' }}>
                  <AlertTriangle size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>{stats.suspended}</div>
              <div className="text-sm text-danger flex items-center gap-2">
                {stats.suspended > 0 ? <span>Action requise</span> : <span className="text-success">Tout est en ordre</span>}
              </div>
            </Card>
          </div>

          <div className="mt-8 grid" style={{ gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
            <Card>
              <h3 className="mb-4 text-lg">Derniers Inscrits</h3>
              <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '500px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0' }}>Nom</th>
                    <th style={{ padding: '0.75rem 0' }}>Groupe</th>
                    <th style={{ padding: '0.75rem 0' }}>Fin Cotisation</th>
                    <th style={{ padding: '0.75rem 0' }}>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-4 text-center text-muted">Aucun inscrit pour le moment.</td>
                    </tr>
                  ) : (
                    stats.recent.map(athlete => {
                      const statut = athlete.cartes_acces?.statut || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut);
                      return (
                        <tr key={athlete.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem 0', fontWeight: '500' }}>{athlete.nom} {athlete.prenom}</td>
                          <td style={{ padding: '1rem 0' }}>{athlete.groupes?.nom || athlete.groupe || '-'}</td>
                          <td style={{ padding: '1rem 0', fontSize: '0.85rem' }}>
                            {athlete.cotisations && athlete.cotisations.length > 0
                              ? new Date(Math.max(...athlete.cotisations.map(c => new Date(c.periode_couverte_fin).getTime()))).toLocaleDateString('fr-FR')
                              : '-'}
                          </td>
                          <td style={{ padding: '1rem 0' }}>
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
              <h3 className="mb-4 text-lg">Actions Rapides</h3>
              <div className="flex flex-col gap-4">
                <Link to="/scanner" target="_blank" style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" className="w-full" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
                    <ScanLine size={18} className="text-accent" /> Lancer le Scanner QR
                  </Button>
                </Link>
                <Link to="/finances" style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" className="w-full" style={{ justifyContent: 'flex-start', padding: '1rem' }}>
                    <DollarSign size={18} className="text-success" /> Gérer les Paiements
                  </Button>
                </Link>
              </div>
            </Card>

            <Card className="md:col-span-2">
              <h3 className="mb-4 text-lg flex items-center gap-2">
                <Clock size={20} className="text-accent" /> Dernières Présences (Aujourd'hui)
              </h3>
              <div className="table-responsive">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0' }}>Heure</th>
                    <th style={{ padding: '0.75rem 0' }}>Athlète</th>
                    <th style={{ padding: '0.75rem 0' }}>Groupe</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentPresences.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-4 text-center text-muted">Aucun scan récent enregistré.</td>
                    </tr>
                  ) : (
                    stats.recentPresences.map(presence => (
                      <tr key={presence.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem 0', fontWeight: '500', color: 'var(--accent-success)' }}>
                          {new Date(presence.date_scan).toLocaleTimeString('fr-FR', { hour: '2-digit', minute:'2-digit' })}
                        </td>
                        <td style={{ padding: '1rem 0', fontWeight: 'bold' }}>
                          {presence.athletes?.nom} {presence.athletes?.prenom}
                        </td>
                        <td style={{ padding: '1rem 0' }}>
                          <Badge status="ACTIVE">{presence.athletes?.groupes?.nom || presence.athletes?.groupe || '-'}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              </div>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
}
