import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Users, Calendar, Activity, ChevronRight, CheckCircle2, Waves, ArrowRight, ArrowUpRight, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // Theme-aware colors
  const colors = {
    bgMain: isDark ? '#0f172a' : '#f8fafc',
    bgAlt: isDark ? '#0b1120' : '#ffffff',
    textMain: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#cbd5e1' : '#475569',
    cardBg: isDark ? 'rgba(255,255,255,0.03)' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.05)' : '#e2e8f0',
    cardHover: isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9',
    headerBg: isDark ? 'rgba(15, 23, 42, 0.8)' : 'rgba(248, 250, 252, 0.8)',
    footerBg: isDark ? '#0b1120' : '#f1f5f9',
  };

  // Animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.15, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: colors.bgMain,
      color: colors.textMain,
      fontFamily: "'Inter', sans-serif",
      overflowX: 'hidden',
      transition: 'background-color 0.3s, color 0.3s'
    }}>
      {/* HEADER / NAVBAR */}
      <header style={{
        padding: '1.5rem 5%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'fixed',
        top: 0, width: '100%',
        backgroundColor: colors.headerBg,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${colors.cardBorder}`,
        zIndex: 50,
        transition: 'background-color 0.3s'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '1.5rem', background: 'linear-gradient(135deg, #3b82f6, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          <img src="/logo.png" alt="SC Bouira Logo" style={{ height: '40px', width: 'auto', borderRadius: '8px' }} />
          SC Bouira
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textMuted, display: 'flex', alignItems: 'center' }}>
            {isDark ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <Link to="/login" style={{ color: colors.textMuted, textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s', fontWeight: 500 }} onMouseOver={e => e.target.style.color = '#3b82f6'} onMouseOut={e => e.target.style.color = colors.textMuted}>
            Espace Admin
          </Link>
          <Button onClick={() => navigate('/inscription')} primary>
            S'inscrire
          </Button>
        </nav>
      </header>

      {/* HERO SECTION */}
      <main style={{ paddingTop: '0px' }}>
        <section style={{ 
          position: 'relative',
          padding: '12rem 5% 8rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          minHeight: '90vh',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {/* Background Image & Overlay */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}>
            <img src="/hero-bg.jpg" alt="Piscine olympique Sporting Club Bouira" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* Overlay is always dark so the white text on hero remains visible! */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.95) 100%)' }} />
          </div>

          <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="visible"
            style={{ position: 'relative', zIndex: 10, maxWidth: '900px' }}
          >
            <motion.div variants={itemVariants} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '20px', color: '#93c5fd', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#60a5fa', display: 'inline-block', boxShadow: '0 0 10px #60a5fa' }}></span>
              Inscriptions Saison 2026/2027 Ouvertes
            </motion.div>
            
            <motion.h1 variants={itemVariants} style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)', fontWeight: 900, lineHeight: 1.05, marginBottom: '1.5rem', letterSpacing: '-0.03em', fontStyle: 'italic', textTransform: 'uppercase', color: '#fff' }}>
              DÉPASSEZ VOS LIMITES AVEC LE <span style={{ color: '#60a5fa', textShadow: '0 0 30px rgba(96,165,250,0.5)' }}>SPORTING CLUB BOUIRA</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} style={{ fontSize: '1.25rem', color: '#cbd5e1', marginBottom: '3rem', maxWidth: '700px', margin: '0 auto 3rem', lineHeight: 1.6, fontWeight: 400 }}>
              Le club de natation de référence. Que vous soyez débutant ou compétiteur, rejoignez une équipe passionnée et atteignez vos objectifs dans un cadre exceptionnel.
            </motion.p>
            
            <motion.div variants={itemVariants} style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={() => navigate('/inscription')}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#fff',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Rejoindre le club <ArrowRight size={18} />
              </button>
              <button 
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
                style={{
                  padding: '1rem 2rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                Découvrir
              </button>
            </motion.div>
          </motion.div>
        </section>

        {/* FEATURES / INFO */}
        <section id="features" style={{ padding: '5rem 5%', background: colors.bgAlt, transition: 'background-color 0.3s' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>Pourquoi nous choisir ?</h2>
              <p style={{ color: colors.textMuted, fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>Un encadrement professionnel pour tous les niveaux, de l'apprentissage à la haute compétition.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <FeatureCard 
                colors={colors}
                icon={<Trophy size={32} color="#f59e0b" />}
                title="Compétition & Excellence"
                desc="Entraînements intensifs et participation aux championnats régionaux et nationaux pour les athlètes d'élite."
              />
              <FeatureCard 
                colors={colors}
                icon={<Users size={32} color="#10b981" />}
                title="Groupes par niveaux"
                desc="Des créneaux adaptés à chaque âge et chaque niveau pour une progression optimale et sécurisée."
              />
              <FeatureCard 
                colors={colors}
                icon={<Activity size={32} color="#ec4899" />}
                title="Suivi des performances"
                desc="Une fiche bilan personnalisée avec des graphiques de progression (vitesse, endurance, technique) pour chaque nageur."
              />
            </div>
          </div>
        </section>

        {/* GROUPS / LEVELS */}
        <section style={{ padding: '6rem 5%' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Nos Programmes</h2>
                <p style={{ color: colors.textMuted, fontSize: '1.1rem' }}>Trouvez le groupe qui correspond à vos ambitions.</p>
              </div>
              <Button onClick={() => navigate('/inscription')} primary style={{ boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)' }}>
                S'inscrire au club <ArrowUpRight size={16} style={{ marginLeft: '8px' }} />
              </Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <ProgramCard colors={colors} title="Apprentissage" age="Enfants 6-10 ans" themeColor="#3b82f6" features={["Familiarisation avec l'eau", 'Flottaison et respiration', 'Bases des 4 nages']} />
              <ProgramCard colors={colors} title="Perfectionnement" age="Ados 11-15 ans" themeColor="#10b981" features={['Amélioration technique', 'Endurance', 'Initiation au chronométrage']} />
              <ProgramCard colors={colors} title="Élite & Compétition" age="16+ ans" themeColor="#f59e0b" features={['Entraînements bi-quotidiens', 'Préparation physique', 'Participation aux tournois']} />
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: `1px solid ${colors.cardBorder}`, padding: '3rem 5%', background: colors.footerBg, color: colors.textMuted, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'background-color 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: colors.textMain, fontWeight: 'bold' }}>
          <img src="/logo.png" alt="SC Bouira Logo" style={{ height: '30px', width: 'auto', borderRadius: '6px' }} /> SC Bouira
        </div>
        <p>© {new Date().getFullYear()} Sporting Club Bouira. Tous droits réservés.</p>
      </footer>
    </div>
  );
}

// Subcomponents
function Button({ children, onClick, primary, style }) {
  return (
    <button 
      onClick={onClick}
      style={{
        padding: '0.6rem 1.2rem',
        borderRadius: '8px',
        fontWeight: 500,
        fontSize: '0.9rem',
        cursor: 'pointer',
        border: 'none',
        background: primary ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'transparent',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        transition: 'transform 0.2s, box-shadow 0.2s',
        ...style
      }}
      onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
      onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
    >
      {children}
    </button>
  );
}

function FeatureCard({ icon, title, desc, colors }) {
  return (
    <div style={{
      background: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: '16px',
      padding: '2rem',
      transition: 'transform 0.3s, background 0.3s',
      cursor: 'default',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
    }}
    onMouseOver={e => e.currentTarget.style.background = colors.cardHover}
    onMouseOut={e => e.currentTarget.style.background = colors.cardBg}
    >
      <div style={{ marginBottom: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', width: '60px', height: '60px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: colors.textMain }}>{title}</h3>
      <p style={{ color: colors.textMuted, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

function ProgramCard({ title, age, themeColor, features, colors }) {
  return (
    <div style={{
      background: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderTop: `3px solid ${themeColor}`,
      borderRadius: '16px',
      padding: '2rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
    }}>
      <div style={{ color: themeColor, fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', letterSpacing: '1px', textTransform: 'uppercase' }}>{age}</div>
      <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color: colors.textMain }}>{title}</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {features.map((feat, idx) => (
          <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: colors.textMuted }}>
            <CheckCircle2 size={16} color={themeColor} /> {feat}
          </li>
        ))}
      </ul>
    </div>
  );
}
