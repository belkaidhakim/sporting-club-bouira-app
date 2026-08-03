import React from 'react';
import { Bell, Search, User, Menu } from 'lucide-react';

export default function Header({ toggleMobileMenu }) {
  return (
    <header className="topbar no-print">
      <div className="flex items-center gap-4" style={{ flex: 1 }}>
        <button 
          className="mobile-menu-btn" 
          onClick={toggleMobileMenu}
        >
          <Menu size={24} color="var(--text-primary)" />
        </button>
        <div className="relative" style={{ maxWidth: '300px', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Rechercher un athlète..." 
            className="form-input" 
            style={{ paddingLeft: '2.5rem', borderRadius: '9999px', backgroundColor: 'var(--bg-secondary)', border: 'none' }}
          />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', position: 'relative' }}>
          <Bell size={20} />
          <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', backgroundColor: 'var(--accent-danger)', borderRadius: '50%' }}></span>
        </button>
        <div style={{ width: '1px', height: '24px', backgroundColor: 'var(--border-color)' }}></div>
        <div className="flex items-center gap-2">
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={18} color="var(--text-primary)" />
          </div>
          <div>
            <div className="text-sm font-semibold">Admin User</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sporting Club Bouira</div>
          </div>
        </div>
      </div>
    </header>
  );
}
