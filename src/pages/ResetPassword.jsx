import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { Mail, Loader, ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Veuillez entrer votre adresse email');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
    } else {
      toast.success('Un email de réinitialisation vous a été envoyé');
      navigate('/login');
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
        
        <div style={{ width: '100%', marginBottom: '2rem' }}>
          <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', textDecoration: 'none', fontSize: '0.875rem' }}>
            <ArrowLeft size={16} />
            Retour à la connexion
          </Link>
        </div>

        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'white' }}>Mot de passe oublié</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Entrez votre email pour recevoir un lien de réinitialisation.</p>
        </div>

        <form onSubmit={handleReset} style={{ width: '100%' }}>
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
              Adresse Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sportingclub.com"
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
                Envoi en cours...
              </>
            ) : (
              'Envoyer le lien'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
