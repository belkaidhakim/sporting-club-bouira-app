import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, Badge, Skeleton } from '../components/ui';
import { Shield, ShieldAlert, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    if (userId === currentUser?.id && newRole !== 'admin') {
      toast.error("Vous ne pouvez pas retirer vos propres droits d'administrateur !");
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('Rôle mis à jour avec succès');
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erreur lors de la mise à jour du rôle');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1>Gestion de l'Équipe</h1>
          <p>Gérez les accès et les rôles des membres de l'administration.</p>
        </div>
      </div>

      <Card>
        {loading ? (
          <div className="flex flex-col gap-4">
            <Skeleton height="50px" />
            <Skeleton height="50px" />
            <Skeleton height="50px" />
          </div>
        ) : (
        <>
          {/* Version Desktop (Tableau) */}
          <div className="responsive-table-desktop table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem 0' }}>Utilisateur (Email)</th>
                  <th style={{ padding: '1rem 0' }}>Rôle Actuel</th>
                  <th style={{ padding: '1rem 0', textAlign: 'right' }}>Actions (Modifier le rôle)</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem 0', fontWeight: '500' }}>
                      <div className="flex items-center gap-3">
                        <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)' }}>
                          <User size={18} />
                        </div>
                        <div>
                          {u.email}
                          {u.id === currentUser?.id && <span style={{ marginLeft: '10px', fontSize: '0.75rem', color: 'var(--accent-primary)', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Vous</span>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 0' }}>
                      <Badge status={u.role === 'admin' ? 'ACTIVE' : (u.role === 'secretaire' ? 'WARNING' : 'INACTIVE')}>
                        {u.role === 'admin' && <Shield size={12} style={{ marginRight: '4px' }} />}
                        {u.role.toUpperCase()}
                      </Badge>
                    </td>
                    <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                      <div className="flex justify-end gap-2">
                        <select 
                          className="form-select" 
                          style={{ padding: '0.4rem 1rem', width: 'auto' }}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={u.id === currentUser?.id}
                        >
                          <option value="admin">Administrateur (Tout accès)</option>
                          <option value="secretaire">Secrétaire (Athlètes & Finances)</option>
                          <option value="entraineur">Entraîneur (Scanner uniquement)</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Version Mobile (Cartes Ergonomiques) */}
          <div className="responsive-cards-mobile">
            {users.map(u => (
              <div 
                key={u.id} 
                className="p-4 rounded-lg flex flex-col items-center text-center" 
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {/* Haut: Nom de l'utilisateur (Email + Badge) */}
                <div className="flex items-center justify-center gap-2 mb-2 w-full">
                  <div style={{ padding: '6px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} />
                  </div>
                  <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{u.email}</span>
                  {u.id === currentUser?.id && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', backgroundColor: 'rgba(99, 102, 241, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Vous</span>
                  )}
                </div>

                {/* Milieu: Rôle Actuel */}
                <div className="mb-4">
                  <Badge status={u.role === 'admin' ? 'ACTIVE' : (u.role === 'secretaire' ? 'WARNING' : 'INACTIVE')}>
                    {u.role === 'admin' && <Shield size={12} style={{ marginRight: '4px' }} />}
                    {u.role.toUpperCase()}
                  </Badge>
                </div>

                {/* Bas: Bouton d'action centré */}
                <div className="w-full flex justify-center mt-1">
                  <select 
                    className="form-select" 
                    style={{ 
                      padding: '0.5rem 1rem', 
                      width: '100%', 
                      maxWidth: '280px', 
                      textAlign: 'center', 
                      textAlignLast: 'center',
                      fontWeight: 500
                    }}
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    disabled={u.id === currentUser?.id}
                  >
                    <option value="admin">Administrateur (Tout accès)</option>
                    <option value="secretaire">Secrétaire (Athlètes & Finances)</option>
                    <option value="entraineur">Entraîneur (Scanner uniquement)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </>
        )}
      </Card>
      
      <div className="mt-6">
        <Card className="flex gap-4 items-start" style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', borderColor: 'rgba(59, 130, 246, 0.2)' }}>
          <ShieldAlert size={24} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
          <div>
            <h3 className="text-lg mb-2" style={{ color: 'var(--accent-primary)' }}>Rappel sur les rôles</h3>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Administrateur :</strong> Accès total au système, y compris la gestion des utilisateurs et la suppression des athlètes.</li>
              <li><strong>Secrétaire :</strong> Peut ajouter et modifier les athlètes, et gérer les paiements. Pas d'accès à cette page de gestion d'équipe.</li>
              <li><strong>Entraîneur :</strong> Peut uniquement utiliser le Scanner QR pour vérifier les accès. Aucune visibilité sur les finances.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
