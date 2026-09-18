import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Users, Calendar, Activity, ChevronRight, CheckCircle2, Waves, ArrowRight, ArrowUpRight } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

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
      backgroundColor: '#0f172a', // Deep modern dark blue
      color: '#f8fafc',
      fontFamily: "'Inter', sans-serif",
      overflowX: 'hidden'
    }}>
      {/* HEADER / NAVBAR */}
      <header style={{
        padding: '1.5rem 5%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'fixed',
        top: 0, width: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 'bold', fontSize: '1.5rem', background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          <Waves size={28} color="#60a5fa" />
          SC Bouira
        </div>
        <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link to="/login" style={{ color: '#cbd5e1', textDecoration: 'none', fontSize: '0.9rem', transition: 'color 0.2s' }} onMouseOver={e => e.target.style.color = '#fff'} onMouseOut={e => e.target.style.color = '#cbd5e1'}>
            Espace Admin
          </Link>
          <Button onClick={() => navigate('/inscription')} primary>
            S'inscrire
          </Button>
        </nav>
      </header>

      {/* HERO SECTION */}
      <main style={{ paddingTop: '100px' }}>
        <section style={{ 
          position: 'relative',
          padding: '8rem 5% 6rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          minHeight: '80vh',
          justifyContent: 'center',
          overflow: 'hidden'
        }}>
          {/* Background Glows */}
          <div style={{ position: 'absolute', top: '20%', left: '10%', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(96,165,250,0.15) 0%, rgba(15,23,42,0) 70%)', filter: 'blur(40px)', zIndex: 0 }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, rgba(15,23,42,0) 70%)', filter: 'blur(50px)', zIndex: 0 }} />

          <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="visible"
            style={{ position: 'relative', zIndex: 10, maxWidth: '800px' }}
          >
            <motion.div variants={itemVariants} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '20px', color: '#60a5fa', fontSize: '0.85rem', fontWeight: 500, marginBottom: '2rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
              Inscriptions Saison 2026/2027 Ouvertes
            </motion.div>
            
            <motion.h1 variants={itemVariants} style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.02em' }}>
              Dépassez vos limites avec le <span style={{ background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sporting Club Bouira</span>
            </motion.h1>
            
            <motion.p variants={itemVariants} style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
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
        <section id="features" style={{ padding: '5rem 5%', background: '#0b1120' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem' }}>Pourquoi nous choisir ?</h2>
              <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>Un encadrement professionnel pour tous les niveaux, de l'apprentissage à la haute compétition.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <FeatureCard 
                icon={<Trophy size={32} color="#f59e0b" />}
                title="Compétition & Excellence"
                desc="Entraînements intensifs et participation aux championnats régionaux et nationaux pour les athlètes d'élite."
              />
              <FeatureCard 
                icon={<Users size={32} color="#10b981" />}
                title="Groupes par niveaux"
                desc="Des créneaux adaptés à chaque âge et chaque niveau pour une progression optimale et sécurisée."
              />
              <FeatureCard 
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
                <p style={{ color: '#94a3b8', fontSize: '1.1rem' }}>Trouvez le groupe qui correspond à vos ambitions.</p>
              </div>
              <Button onClick={() => navigate('/inscription')} primary style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}>S'inscrire au club <ArrowUpRight size={16} style={{ marginLeft: '8px' }} /></Button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <ProgramCard title="Apprentissage" age="Enfants 6-10 ans" color="#3b82f6" features={["Familiarisation avec l'eau", 'Flottaison et respiration', 'Bases des 4 nages']} />
              <ProgramCard title="Perfectionnement" age="Ados 11-15 ans" color="#10b981" features={['Amélioration technique', 'Endurance', 'Initiation au chronométrage']} />
              <ProgramCard title="Élite & Compétition" age="16+ ans" color="#f59e0b" features={['Entraînements bi-quotidiens', 'Préparation physique', 'Participation aux tournois']} />
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '3rem 5%', background: '#0b1120', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff', fontWeight: 'bold' }}>
          <Waves size={20} color="#60a5fa" /> SC Bouira
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
        ...style
      }}
    >
      {children}
    </button>
  );
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '16px',
      padding: '2rem',
      transition: 'transform 0.3s, background 0.3s',
      cursor: 'default'
    }}
    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
    onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
    >
      <div style={{ marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', width: '60px', height: '60px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>{title}</h3>
      <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

function ProgramCard({ title, age, color, features }) {
  return (
    <div style={{
      background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(255,255,255,0.01))',
      border: '1px solid rgba(255,255,255,0.05)',
      borderTop: `2px solid ${color}`,
      borderRadius: '16px',
      padding: '2rem'
    }}>
      <div style={{ color: color, fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', letterSpacing: '1px', textTransform: 'uppercase' }}>{age}</div>
      <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem' }}>{title}</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {features.map((feat, idx) => (
          <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#cbd5e1' }}>
            <CheckCircle2 size={16} color={color} /> {feat}
          </li>
        ))}
      </ul>
    </div>
  );
}
