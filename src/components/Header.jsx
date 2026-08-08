import React from 'react';
import { Bell, User, Menu, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

export default function Header({ toggleMobileMenu }) {
  const { user, role } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const displayName = user?.email?.split('@')[0] || 'Utilisateur';
  const roleLabels = { admin: 'Administrateur', secretaire: 'Secrétaire', entraineur: 'Entraîneur' };
  const displayRole = roleLabels[role] || 'Membre';

  return (
    <header className="topbar no-print">
      <div className="flex items-center gap-4" style={{ flex: 1 }}>
        <button 
          className="mobile-menu-btn" 
          onClick={toggleMobileMenu}
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
        {/* Toggle Theme Button */}
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

        <button style={{ 
          background: 'var(--bg-tertiary)', 
          border: '1px solid var(--border-color)', 
          color: 'var(--text-secondary)', 
          cursor: 'pointer', 
          position: 'relative',
          borderRadius: 'var(--radius-md)',
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s'
        }}>
          <Bell size={16} />
          <span style={{ 
            position: 'absolute', 
            top: '6px', 
            right: '6px', 
            width: '6px', 
            height: '6px', 
            backgroundColor: 'var(--accent-danger)', 
            borderRadius: '50%',
            boxShadow: '0 0 6px var(--accent-danger-glow)'
          }}></span>
        </button>
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }}></div>
        <div className="flex items-center gap-2">
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '50%', 
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 0 12px rgba(99, 102, 241, 0.2)'
          }}>
            <User size={15} color="white" />
          </div>
        </div>
      </div>
    </header>
  );
}
