import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { Lock, Mail, Loader } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';

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
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background orbs */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15), transparent 70%)',
          top: '-10%',
          left: '-5%',
          animation: 'aurora 15s ease-in-out infinite alternate',
          filter: 'blur(40px)'
        }} />
        <div style={{
          position: 'absolute',
          width: '350px',
          height: '350px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34, 211, 238, 0.1), transparent 70%)',
          bottom: '-10%',
          right: '-5%',
          animation: 'aurora 18s ease-in-out infinite alternate-reverse',
          filter: 'blur(40px)'
        }} />
      </div>

      <motion.div 
        className="glass-panel" 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '2.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 1
        }}
      >
        
        {/* Logo and Branding */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          style={{ marginBottom: '2rem', textAlign: 'center' }}
        >
          <div style={{
            position: 'relative',
            width: '88px',
            height: '88px',
            margin: '0 auto 1.25rem',
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              padding: '3px',
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.25)'
            }}>
              <img src="/logo.jpg" alt="Logo Sporting Club Bouira" style={{ 
                width: '100%', 
                height: '100%', 
                borderRadius: '50%', 
                objectFit: 'cover',
                border: '3px solid var(--bg-primary)'
              }} />
            </div>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.15rem', color: 'white', letterSpacing: '0.04em' }}>SPORTING CLUB</h1>
          <p style={{ color: 'var(--accent-secondary)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 0 }}>Bouira</p>
        </motion.div>

        {/* Login Form */}
        <motion.form 
          onSubmit={handleLogin} 
          style={{ width: '100%' }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label">Adresse Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sportingclub.com"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                disabled={loading}
              />
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label className="form-label">Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
                disabled={loading}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Link to="/reset-password" style={{ fontSize: '0.75rem', color: 'var(--accent-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}>
                Mot de passe oublié ?
              </Link>
            </div>
          </div>

          <motion.button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.9rem' }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={18} />
                Patientez...
              </>
            ) : (
              isSignUp ? "Créer mon compte" : "Se connecter"
            )}
          </motion.button>
        </motion.form>
        
        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <button 
            type="button" 
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            {isSignUp ? "Vous avez déjà un compte ? " : "Pas encore de compte ? "}
            <span style={{ color: 'var(--accent-primary-hover)', textDecoration: 'underline' }}>
              {isSignUp ? "Connectez-vous" : "S'inscrire"}
            </span>
          </button>
        </div>
        
        <p style={{ marginTop: '1.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
          Accès restreint aux administrateurs du club.<br/>En cas de problème, contactez le support technique.
        </p>

      </motion.div>
    </div>
  );
}
