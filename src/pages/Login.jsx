import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { Lock, Mail, Loader } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast.error("Erreur d'inscription: " + error.message);
        setLoading(false);
      } else {
        toast.success("Compte créé avec succès ! Connectez-vous.");
        setIsSignUp(false);
        setLoading(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error('Identifiants incorrects');
        setLoading(false);
      } else {
        toast.success('Connexion réussie');
        navigate('/dashboard');
      }
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
        
        {/* Logo and Branding */}
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            backgroundColor: 'white',
            padding: '4px',
            margin: '0 auto 1.5rem',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
          }}>
            <img src="/logo.jpg" alt="Logo Sporting Club Bouira" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.25rem', color: 'white', letterSpacing: '0.5px' }}>SPORTING CLUB</h1>
          <p style={{ color: '#94a3b8', fontSize: '1rem', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>Bouira</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} style={{ width: '100%' }}>
          <div style={{ marginBottom: '1.5rem' }}>
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

          <div style={{ marginBottom: '2.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 500 }}>
              Mot de passe
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Link to="/reset-password" style={{ fontSize: '0.75rem', color: '#38bdf8', textDecoration: 'none' }}>
                Mot de passe oublié ?
              </Link>
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
                Patientez...
              </>
            ) : (
              isSignUp ? "Créer mon compte" : "Se connecter"
            )}
          </button>
        </form>
        
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {isSignUp ? "Vous avez déjà un compte ? Connectez-vous" : "Pas encore de compte ? S'inscrire"}
          </button>
        </div>
        
        <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#475569', textAlign: 'center' }}>
          Accès restreint aux administrateurs du club.<br/>En cas d'oubli de mot de passe, contactez le support technique.
        </p>

      </div>
    </div>
  );
}
