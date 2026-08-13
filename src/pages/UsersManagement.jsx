import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, Badge, Skeleton, Button } from '../components/ui';
import { Shield, ShieldAlert, User, UserPlus, Search, Filter, Loader, X, AlertTriangle, CheckCircle2, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  
  // Modal Création Membre
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('entraineur');
  const [createLoading, setCreateLoading] = useState(false);

  // Modal Confirmation de Rôle (Sécurité tactile)
  const [confirmModal, setConfirmModal] = useState({ open: false, user: null, targetRole: '' });
  const [updateLoading, setUpdateLoading] = useState(false);

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

  // Ouvre la modale de confirmation au lieu d'appliquer immédiatement
  const requestRoleChange = (targetUser, targetRole) => {
    if (targetUser.id === currentUser?.id && targetRole !== 'admin') {
      toast.error("Vous ne pouvez pas retirer vos propres droits d'administrateur !");
      return;
    }
    if (targetUser.role === targetRole) return;

    setConfirmModal({
      open: true,
      user: targetUser,
      targetRole
    });
  };

  // Confirmation effective du changement de rôle
  const confirmRoleChange = async () => {
    if (!confirmModal.user || !confirmModal.targetRole) return;

    const { user: targetUser, targetRole } = confirmModal;

    try {
      setUpdateLoading(true);
      const { error } = await supabase
        .from('profiles')
        .update({ role: targetRole })
        .eq('id', targetUser.id);

      if (error) throw error;
      
      toast.success(`Rôle de ${targetUser.email} mis à jour : ${targetRole.toUpperCase()}`);
      setUsers(users.map(u => u.id === targetUser.id ? { ...u, role: targetRole } : u));
      setConfirmModal({ open: false, user: null, targetRole: '' });
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erreur lors de la mise à jour du rôle');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Activation / Suspension du compte
  const toggleUserAccountStatus = async (targetUser) => {
    if (targetUser.id === currentUser?.id) {
      toast.error("Vous ne pouvez pas désactiver votre propre compte !");
      return;
    }

    const newStatus = !(targetUser.is_active !== false); // default active if undefined

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', targetUser.id);

      if (error) throw error;

      toast.success(newStatus ? `Compte de ${targetUser.email} activé` : `Compte de ${targetUser.email} suspendu`);
      setUsers(users.map(u => u.id === targetUser.id ? { ...u, is_active: newStatus } : u));
    } catch (err) {
      console.error('Error toggling user status:', err);
      toast.error("Erreur lors de la modification du statut du compte");
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      toast.error("Veuillez remplir l'email et le mot de passe.");
      return;
    }

    try {
      setCreateLoading(true);
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
      });

      if (authError) throw authError;

      if (authData?.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            email: newEmail,
            role: newRole,
            is_active: true
          });

        if (profileError) {
          console.warn("Mise à jour du profil:", profileError);
        }
      }

      toast.success(`Le membre ${newEmail} a été ajouté avec succès !`);
      setIsModalOpen(false);
      setNewEmail('');
      setNewPassword('');
      setNewRole('entraineur');
      fetchUsers();
    } catch (err) {
      toast.error(err.message || "Erreur lors de la création du membre.");
    } finally {
      setCreateLoading(false);
    }
  };

  // Utilisateurs filtrés
  const filteredUsers = users.filter(u => {
    const matchesSearch = (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div>
      {/* Header avec CTA Ajouter un membre */}
      <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
        <div>
          <h1>Gestion de l'Équipe</h1>
          <p style={{ marginBottom: 0 }}>Gérez les accès, la sécurité et les rôles des membres de l'administration.</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <UserPlus size={18} /> + Ajouter un membre
        </Button>
      </div>

      <Card>
        {/* Barre de Recherche et Filtres */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-3 pb-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="flex items-center gap-2" style={{ flex: 1, minWidth: '220px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Rechercher par email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', padding: '0.4rem 1rem', fontSize: '0.85rem' }}
            >
              <option value="all">Tous les rôles ({users.length})</option>
              <option value="admin">Administrateurs ({users.filter(u => u.role === 'admin').length})</option>
              <option value="secretaire">Secrétaires ({users.filter(u => u.role === 'secretaire').length})</option>
              <option value="entraineur">Entraîneurs ({users.filter(u => u.role === 'entraineur').length})</option>
            </select>
          </div>
        </div>

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
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem 0' }}>Utilisateur (Email)</th>
                  <th style={{ padding: '1rem 0' }}>Statut du Compte</th>
                  <th style={{ padding: '1rem 0' }}>Rôle Actuel</th>
                  <th style={{ padding: '1rem 0', textAlign: 'right' }}>Actions (Modifier le rôle)</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-muted">Aucun membre trouvé pour ces critères.</td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const isActive = u.is_active !== false;
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '1rem 0', fontWeight: '500' }}>
                          <div className="flex items-center gap-3">
                            <div style={{ padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)' }}>
                              <User size={18} />
                            </div>
                            <div>
                              <div>
                                {u.email}
                                {u.id === currentUser?.id && <span style={{ marginLeft: '8px', fontSize: '0.7rem', color: 'var(--accent-primary)', backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Vous</span>}
                              </div>
                              {u.created_at && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  Inscrit le {new Date(u.created_at).toLocaleDateString('fr-FR')}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Statut de compte visuel */}
                        <td style={{ padding: '1rem 0' }}>
                          <button
                            onClick={() => toggleUserAccountStatus(u)}
                            style={{ background: 'none', border: 'none', cursor: u.id === currentUser?.id ? 'default' : 'pointer', padding: 0 }}
                            title={isActive ? "Cliquer pour suspendre" : "Cliquer pour activer"}
                          >
                            <Badge status={isActive ? 'ACTIVE' : 'SUSPENDUE'}>
                              {isActive ? <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> : <Ban size={12} style={{ marginRight: '4px' }} />}
                              {isActive ? 'Compte Actif' : 'Compte Suspendu'}
                            </Badge>
                          </button>
                        </td>

                        {/* Rôle */}
                        <td style={{ padding: '1rem 0' }}>
                          <Badge status={u.role === 'admin' ? 'ACTIVE' : (u.role === 'secretaire' ? 'WARNING' : 'INACTIVE')}>
                            {u.role === 'admin' && <Shield size={12} style={{ marginRight: '4px' }} />}
                            {u.role ? u.role.toUpperCase() : 'MEMBRE'}
                          </Badge>
                        </td>

                        {/* Action rôle */}
                        <td style={{ padding: '1rem 0', textAlign: 'right' }}>
                          <div className="flex justify-end gap-2">
                            <select 
                              className="form-select" 
                              style={{ padding: '0.4rem 1rem', width: 'auto' }}
                              value={u.role || 'entraineur'}
                              onChange={(e) => requestRoleChange(u, e.target.value)}
                              disabled={u.id === currentUser?.id}
                            >
                              <option value="admin">Administrateur (Tout accès)</option>
                              <option value="secretaire">Secrétaire (Athlètes & Finances)</option>
                              <option value="entraineur">Entraîneur (Scanner uniquement)</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Version Mobile (Cartes Ergonomiques) */}
          <div className="responsive-cards-mobile">
            {filteredUsers.length === 0 ? (
              <div className="p-8 text-center text-muted">Aucun membre trouvé.</div>
            ) : (
              filteredUsers.map(u => {
                const isActive = u.is_active !== false;
                return (
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
                    <div className="flex items-center justify-between gap-2 mb-2 w-full pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <div className="flex items-center gap-2">
                        <div style={{ padding: '6px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={16} />
                        </div>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{u.email}</span>
                      </div>
                      {u.id === currentUser?.id && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', backgroundColor: 'rgba(99, 102, 241, 0.15)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Vous</span>
                      )}
                    </div>

                    {/* Milieu: Statut Compte & Rôle Actuel */}
                    <div className="flex flex-wrap justify-center gap-2 mb-3">
                      <button
                        onClick={() => toggleUserAccountStatus(u)}
                        style={{ background: 'none', border: 'none', cursor: u.id === currentUser?.id ? 'default' : 'pointer', padding: 0 }}
                      >
                        <Badge status={isActive ? 'ACTIVE' : 'SUSPENDUE'}>
                          {isActive ? <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> : <Ban size={12} style={{ marginRight: '4px' }} />}
                          {isActive ? 'Actif' : 'Suspendu'}
                        </Badge>
                      </button>

                      <Badge status={u.role === 'admin' ? 'ACTIVE' : (u.role === 'secretaire' ? 'WARNING' : 'INACTIVE')}>
                        {u.role === 'admin' && <Shield size={12} style={{ marginRight: '4px' }} />}
                        {u.role ? u.role.toUpperCase() : 'MEMBRE'}
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
                        value={u.role || 'entraineur'}
                        onChange={(e) => requestRoleChange(u, e.target.value)}
                        disabled={u.id === currentUser?.id}
                      >
                        <option value="admin">Administrateur (Tout accès)</option>
                        <option value="secretaire">Secrétaire (Athlètes & Finances)</option>
                        <option value="entraineur">Entraîneur (Scanner uniquement)</option>
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
        )}
      </Card>

      {/* MODAL CONFIRMATION DE ROLES (Anti-erreur tactile) */}
      {confirmModal.open && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 110 }}>
          <Card style={{ width: '100%', maxWidth: '440px', margin: '1rem', position: 'relative' }}>
            <button 
              onClick={() => setConfirmModal({ open: false, user: null, targetRole: '' })}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4" style={{ color: 'var(--accent-warning)' }}>
              <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.12)' }}>
                <AlertTriangle size={26} />
              </div>
              <div>
                <h3 className="m-0" style={{ fontSize: '1.1rem' }}>Confirmer le changement de rôle</h3>
                <span className="text-xs text-muted">Prévention des modifications accidentelles</span>
              </div>
            </div>

            <div className="p-4 mb-4 rounded-lg text-sm" style={{ backgroundColor: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
              <div className="mb-2"><strong>Utilisateur :</strong> {confirmModal.user?.email}</div>
              <div className="mb-2"><strong>Rôle actuel :</strong> <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{confirmModal.user?.role}</span></div>
              <div><strong>Nouveau rôle :</strong> <span style={{ color: 'var(--accent-primary-hover)', textTransform: 'uppercase', fontWeight: 700 }}>{confirmModal.targetRole}</span></div>
            </div>

            {confirmModal.user?.role === 'admin' && confirmModal.targetRole !== 'admin' && (
              <div className="p-3 mb-4 rounded-lg text-xs flex items-start gap-2" style={{ backgroundColor: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-danger)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Avertissement de sécurité :</strong> Vous êtes sur le point de **retirer les privilèges d'Administrateur** à cet utilisateur. Il n'aura plus accès à la gestion des membres ni à la suppression de données.
                </span>
              </div>
            )}

            <div className="flex gap-3 justify-end mt-4">
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setConfirmModal({ open: false, user: null, targetRole: '' })}
                disabled={updateLoading}
              >
                Annuler
              </Button>
              <Button 
                type="button" 
                variant="primary" 
                onClick={confirmRoleChange}
                disabled={updateLoading}
              >
                {updateLoading ? <Loader className="animate-spin" size={16} /> : <Shield size={16} />}
                Confirmer la modification
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL AJOUT D'UN MEMBRE */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <Card style={{ width: '100%', maxWidth: '480px', margin: '1rem', position: 'relative' }}>
            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 className="mb-1 flex items-center gap-2">
              <UserPlus size={22} className="text-accent" /> Ajouter un Membre à l'Équipe
            </h2>
            <p className="text-sm text-muted mb-6">Créez le compte d'accès pour un nouvel entraîneur ou secrétaire.</p>

            <form onSubmit={handleCreateUser} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Adresse Email *</label>
                <input 
                  type="email" 
                  className="form-input" 
                  required 
                  placeholder="exemple@sportingclub.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  disabled={createLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mot de passe initial *</label>
                <input 
                  type="password" 
                  className="form-input" 
                  required 
                  placeholder="Au moins 6 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={createLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rôle Attribué *</label>
                <select 
                  className="form-select"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  disabled={createLoading}
                >
                  <option value="entraineur">Entraîneur (Accès Scanner uniquement)</option>
                  <option value="secretaire">Secrétaire (Gestion Athlètes & Finances)</option>
                  <option value="admin">Administrateur (Tout accès)</option>
                </select>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)} disabled={createLoading}>
                  Annuler
                </Button>
                <Button type="submit" variant="primary" disabled={createLoading}>
                  {createLoading ? <Loader className="animate-spin" size={16} /> : <UserPlus size={16} />}
                  Créer le membre
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
      
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
