import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { Lock, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is actually in a recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session de réinitialisation invalide ou expirée.');
        navigate('/login');
      }
    };
    checkSession();
  }, [navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Mot de passe mis à jour avec succès');
      navigate('/dashboard');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      backgroundColor: '#0f172a',
      backgroundImage: 'radial-gradient(circle at 50% 0%, #1e293b 0%, #0f172a 70%)'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '3rem 2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'white' }}>Nouveau mot de passe</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Veuillez entrer votre nouveau mot de passe.</p>
        </div>

        <form onSubmit={handleUpdate} style={{ width: '100%' }}>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
              Nouveau mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                style={{ width: '100%', paddingLeft: '3rem', backgroundColor: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '0.875rem', fontSize: '1rem' }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={20} />
                Mise à jour...
              </>
            ) : (
              'Mettre à jour'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
