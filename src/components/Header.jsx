import React, { useState, useEffect, useRef } from 'react';
import { Bell, User, Menu, Sun, Moon, LogOut, KeyRound, Shield, Clock, ScanLine, X, Check, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Header({ toggleMobileMenu }) {
  const { user, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Formulaire changement de mot de passe
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Données des notifications
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const displayName = user?.email?.split('@')[0] || 'Utilisateur';
  const roleLabels = { admin: 'Administrateur', secretaire: 'Secrétaire', entraineur: 'Entraîneur' };
  const displayRole = roleLabels[role] || 'Membre';

  // Charger les notifications dynamiques
  const fetchNotifications = async () => {
    try {
      setLoadingNotifications(true);
      const items = [];

      // 1. Cotisations expirant sous 7 jours
      const now = new Date();
      const in7Days = new Date();
      in7Days.setDate(in7Days.getDate() + 7);

      const { data: athletesData } = await supabase
        .from('athletes')
        .select('id, nom, prenom, cotisations(periode_couverte_fin)')
        .eq('est_actif', true);

      athletesData?.forEach(a => {
        if (a.cotisations && a.cotisations.length > 0) {
          const sorted = [...a.cotisations].sort((x, y) => new Date(y.periode_couverte_fin) - new Date(x.periode_couverte_fin));
          const endDate = new Date(sorted[0].periode_couverte_fin);
          if (endDate >= now && endDate <= in7Days) {
            const days = Math.max(0, Math.ceil((endDate - now) / (1000 * 60 * 60 * 24)));
            items.push({
              id: `cotis-${a.id}`,
              type: 'warning',
              title: 'Cotisation expirant bientôt',
              message: `${a.nom} ${a.prenom} expire dans ${days === 0 ? "aujourd'hui" : `${days}j`} (${endDate.toLocaleDateString('fr-FR')})`,
              time: 'Attention requise',
              link: '/finances'
            });
          }
        }
      });

      // 2. Derniers scans de présence
      const { data: recentScans } = await supabase
        .from('presences')
        .select('id, date_scan, athletes(nom, prenom)')
        .order('date_scan', { ascending: false })
        .limit(3);

      recentScans?.forEach(p => {
        const scanTime = new Date(p.date_scan);
        items.push({
          id: `scan-${p.id}`,
          type: 'info',
          title: 'Pointage enregistré',
          message: `${p.athletes?.nom || 'Athlète'} ${p.athletes?.prenom || ''} a validé son badge`,
          time: scanTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          link: '/dashboard'
        });
      });

      setNotifications(items);
      setUnreadCount(items.length);
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Rafraîchissement chaque minute
    return () => clearInterval(interval);
  }, []);

  // Fermer les popups si on clique en dehors
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Changer le mot de passe
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error('Le mot de passe doit comporter au moins 6 caractères');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      setPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success('Mot de passe mis à jour avec succès !');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      toast.error('Erreur : ' + (error.message || 'Impossible de mettre à jour le mot de passe'));
    } finally {
      setPasswordLoading(false);
    }
  };

  // Déconnexion
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Erreur lors de la déconnexion');
    } else {
      toast.success('Déconnecté');
      navigate('/login');
    }
  };

  return (
    <>
      <header className="topbar no-print">
        <div className="flex items-center gap-4" style={{ flex: 1 }}>
          <button 
            className="mobile-menu-btn" 
            onClick={toggleMobileMenu}
            aria-label="Ouvrir le menu"
          >
            <Menu size={22} color="var(--text-primary)" />
          </button>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
              Bienvenue, <span style={{ color: 'var(--accent-primary-hover)' }}>{displayName}</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              {displayRole} · Sporting Club Bouira
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Bouton Toggle Thème */}
          <button 
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            style={{ 
              background: 'var(--bg-tertiary)', 
              border: '1px solid var(--border-color)', 
              color: 'var(--text-primary)', 
              cursor: 'pointer', 
              borderRadius: 'var(--radius-md)',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s'
            }}
          >
            {theme === 'dark' ? <Sun size={17} style={{ color: '#f59e0b' }} /> : <Moon size={17} style={{ color: '#6366f1' }} />}
          </button>

          {/* Bouton Cloche de Notifications */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfileMenu(false);
              }}
              title="Centre de notifications"
              style={{ 
                background: showNotifications ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-tertiary)', 
                border: showNotifications ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)', 
                color: showNotifications ? 'var(--accent-primary-hover)' : 'var(--text-secondary)', 
                cursor: 'pointer', 
                position: 'relative',
                borderRadius: 'var(--radius-md)',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span style={{ 
                  position: 'absolute', 
                  top: '-3px', 
                  right: '-3px', 
                  minWidth: '16px', 
                  height: '16px', 
                  backgroundColor: 'var(--accent-danger)', 
                  color: 'white',
                  borderRadius: '9999px',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 4px',
                  boxShadow: '0 0 8px var(--accent-danger-glow)'
                }}>
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Menu Déroulant Notifications */}
            {showNotifications && (
              <div 
                className="glass-panel"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '46px',
                  width: '320px',
                  maxWidth: '90vw',
                  maxHeight: '420px',
                  overflowY: 'auto',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 50,
                  padding: '0.75rem'
                }}
              >
                <div className="flex justify-between items-center pb-2 mb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div className="flex items-center gap-2">
                    <Bell size={15} style={{ color: 'var(--accent-primary-hover)' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>Notifications</span>
                  </div>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => setUnreadCount(0)}
                      style={{ background: 'none', border: 'none', color: 'var(--accent-secondary)', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>

                {loadingNotifications ? (
                  <div className="p-4 text-center text-muted text-xs">Chargement des alertes...</div>
                ) : notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted text-xs">
                    🎉 Aucune nouvelle alerte pour le moment.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {notifications.map((n) => (
                      <Link 
                        key={n.id} 
                        to={n.link} 
                        onClick={() => setShowNotifications(false)}
                        style={{ 
                          textDecoration: 'none',
                          padding: '8px 10px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: n.type === 'warning' ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-tertiary)',
                          border: n.type === 'warning' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid var(--border-color)',
                          display: 'flex',
                          alignItems: 'start',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ marginTop: '2px', flexShrink: 0 }}>
                          {n.type === 'warning' ? (
                            <Clock size={15} style={{ color: '#f59e0b' }} />
                          ) : (
                            <ScanLine size={15} style={{ color: '#38bdf8' }} />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{n.title}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>{n.message}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>{n.time}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }}></div>

          {/* Bouton Profil Utilisateur avec Dropdown */}
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => {
                setShowProfileMenu(!showProfileMenu);
                setShowNotifications(false);
              }}
              title="Mon compte"
              style={{ 
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <div style={{ 
                width: '34px', 
                height: '34px', 
                borderRadius: '50%', 
                background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: showProfileMenu ? '0 0 16px rgba(99, 102, 241, 0.5)' : '0 0 10px rgba(99, 102, 241, 0.2)',
                border: showProfileMenu ? '2px solid white' : '2px solid transparent',
                transition: 'all 0.2s ease'
              }}>
                <User size={16} color="white" />
              </div>
            </button>

            {/* Menu Déroulant Profil */}
            {showProfileMenu && (
              <div 
                className="glass-panel"
                style={{
                  position: 'absolute',
                  right: 0,
                  top: '46px',
                  width: '240px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 50,
                  padding: '0.75rem'
                }}
              >
                <div className="pb-3 mb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                    {user?.email}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Shield size={12} style={{ color: 'var(--accent-primary)' }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary-hover)', fontWeight: 600 }}>
                      {displayRole}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <button 
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowPasswordModal(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    <KeyRound size={15} style={{ color: 'var(--accent-secondary)' }} />
                    Changer mot de passe
                  </button>

                  <button 
                    onClick={toggleTheme}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    {theme === 'dark' ? <Sun size={15} style={{ color: '#f59e0b' }} /> : <Moon size={15} style={{ color: '#6366f1' }} />}
                    {theme === 'dark' ? 'Mode Clair' : 'Mode Sombre'}
                  </button>

                  <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }} />

                  <button 
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'transparent',
                      border: 'none',
                      color: 'var(--accent-danger)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    <LogOut size={15} />
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* MODALE CHANGEMENT DE MOT DE PASSE */}
      {showPasswordModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div className="glass-panel p-6" style={{ width: '420px', maxWidth: '95vw', position: 'relative', borderRadius: '16px' }}>
            <button 
              onClick={() => setShowPasswordModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)' }}>
                <KeyRound size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Modifier mon mot de passe</h2>
                <span className="text-xs text-muted">Compte : {user?.email}</span>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
              <div className="form-group">
                <label className="form-label">Nouveau mot de passe *</label>
                <input 
                  type="password"
                  className="form-input"
                  required
                  placeholder="Minimum 6 caractères"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={passwordLoading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirmer le mot de passe *</label>
                <input 
                  type="password"
                  className="form-input"
                  required
                  placeholder="Répétez le nouveau mot de passe"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={passwordLoading}
                />
              </div>

              <div className="flex gap-3 justify-end mt-3">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setShowPasswordModal(false)}
                  disabled={passwordLoading}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? <Loader className="animate-spin" size={16} /> : <Check size={16} />}
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
