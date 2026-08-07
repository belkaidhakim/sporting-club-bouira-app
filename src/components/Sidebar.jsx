import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CreditCard, ScanLine, LogOut, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';

export default function Sidebar({ isOpen, setIsOpen }) {
  return (
    <>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="sidebar-overlay"
          onClick={() => setIsOpen(false)}
        />
      )}
      <aside className={`sidebar ${isOpen ? 'open' : ''} no-print`}>
        <button 
          className="sidebar-close-btn"
          onClick={() => setIsOpen(false)}
        >
          <X size={24} />
        </button>
        <div className="sidebar-logo">
          <img src="/logo.jpg" alt="Logo Sporting Club Bouira" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1.1 }}>SPORTING CLUB</h2>
            <span className="text-sm text-muted" style={{ fontWeight: 600 }}>BOUIRA</span>
          </div>
        </div>
      
      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          <LayoutDashboard size={20} />
          <span>Tableau de bord</span>
        </NavLink>
        <NavLink to="/athletes" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          <Users size={20} />
          <span>Athlètes</span>
        </NavLink>
        <NavLink to="/finances" className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}>
          <CreditCard size={20} />
          <span>Finances</span>
        </NavLink>
        <div style={{ margin: '2rem 1.5rem 0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', fontWeight: 600 }}>
          Outils
        </div>
        <NavLink to="/scanner" target="_blank" className="nav-item">
          <ScanLine size={20} />
          <span>Scanner QR</span>
        </NavLink>

        <div style={{ flex: 1 }}></div>
        
        <motion.button 
          whileHover={{ x: 5, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
          whileTap={{ scale: 0.95 }}
          className="nav-item" 
          style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', color: '#ef4444', marginTop: 'auto', marginBottom: '1rem' }}
          onClick={async () => {
            const { error } = await supabase.auth.signOut();
            if (error) {
              toast.error('Erreur lors de la déconnexion');
            } else {
              toast.success('Déconnecté');
            }
          }}
        >
          <LogOut size={20} />
          <span>Déconnexion</span>
        </motion.button>
      </nav>
    </aside>
    </>
  );
}
