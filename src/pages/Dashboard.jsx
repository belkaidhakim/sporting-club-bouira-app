import React, { useState, useEffect } from 'react';
import { Users, AlertTriangle, TrendingUp, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

export default function Dashboard() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    suspended: 0,
    recent: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);
        // Fetch athletes with their cartes_acces
        const { data, error } = await supabase
          .from('athletes')
          .select(`*, cartes_acces(statut), cotisations(periode_couverte_fin)`)
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

        setStats({
          total: data?.length || 0,
          active,
          suspended,
          recent: data?.slice(0, 5) || []
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
        <Link to="/athletes/new" className="btn btn-primary">
          + Nouvel Athlète
        </Link>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted">Chargement des statistiques...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 mt-4" style={{ gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
            <div className="glass-card flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-muted">Total Athlètes</h3>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent-primary)' }}>
                  <Users size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total}</div>
            </div>

            <div className="glass-card flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-muted">Cotisations à jour</h3>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)' }}>
                  <CreditCard size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.active}</div>
              <div className="text-sm text-muted">Sur {stats.total} athlètes inscrits</div>
            </div>

            <div className="glass-card flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-muted">Impayés / Expirés</h3>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)' }}>
                  <AlertTriangle size={20} />
                </div>
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.suspended}</div>
              <div className="text-sm text-danger flex items-center gap-2">
                {stats.suspended > 0 ? <span>Action requise</span> : <span className="text-success">Tout est en ordre</span>}
              </div>
            </div>
          </div>

          <div className="mt-8 grid" style={{ gap: '1.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <div className="glass-panel p-6">
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
                          <td style={{ padding: '1rem 0' }}>{athlete.groupe || '-'}</td>
                          <td style={{ padding: '1rem 0', fontSize: '0.85rem' }}>
                            {athlete.cotisations && athlete.cotisations.length > 0
                              ? new Date(Math.max(...athlete.cotisations.map(c => new Date(c.periode_couverte_fin).getTime()))).toLocaleDateString('fr-FR')
                              : '-'}
                          </td>
                          <td style={{ padding: '1rem 0' }}>
                            {statut === 'ACTIVE' 
                              ? <span className="badge badge-active">Active</span> 
                              : <span className="badge badge-suspended">Suspendue</span>
                            }
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
              </div>
            </div>

            <div className="glass-panel p-6">
              <h3 className="mb-4 text-lg">Actions Rapides</h3>
              <div className="flex flex-col gap-4">
                <Link to="/scanner" target="_blank" className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start' }}>
                   Lancer le Scanner QR
                </Link>
                <Link to="/finances" className="btn btn-secondary w-full" style={{ justifyContent: 'flex-start' }}>
                   Gérer les Paiements
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
