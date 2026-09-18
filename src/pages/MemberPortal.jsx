import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { LogOut, CreditCard, Calendar, Activity, CheckCircle, AlertTriangle, User, Shield, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function MemberPortal() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('member_session'));
    } catch {
      return null;
    }
  });

  const [loginData, setLoginData] = useState({ nom: '', prenom: '', date_naissance: '' });
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Theme-aware colors
  const colors = {
    bgMain: isDark ? '#0f172a' : '#f8fafc',
    bgCard: isDark ? '#1e293b' : '#ffffff',
    textMain: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
  };

  useEffect(() => {
    if (session?.id) {
      fetchAthleteData(session.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAthleteData = async (athleteId) => {
    try {
      const { data } = await supabase
        .from('athletes')
        .select(`
          *,
          cotisations (*),
          cartes_acces (*)
        `)
        .eq('id', athleteId)
        .single();
      
      if (data) {
        setSession(data);
        localStorage.setItem('member_session', JSON.stringify(data));
      } else {
        handleLogout();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('athletes')
        .select(`
          *,
          cotisations (*),
          cartes_acces (*)
        `)
        .ilike('nom', loginData.nom.trim())
        .ilike('prenom', loginData.prenom.trim())
        .eq('date_naissance', loginData.date_naissance);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const athlete = data[0];
        setSession(athlete);
        localStorage.setItem('member_session', JSON.stringify(athlete));
        toast.success(`Bienvenue ${athlete.prenom} !`);
      } else {
        toast.error("Aucun dossier ne correspond à ces informations.");
      }
    } catch (err) {
      toast.error("Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('member_session');
  };

  const getLatestCotisation = () => {
    if (!session?.cotisations || session.cotisations.length === 0) return null;
    return [...session.cotisations].sort((a, b) => new Date(b.periode_couverte_fin) - new Date(a.periode_couverte_fin))[0];
  };

  const getStatus = () => {
    const latest = getLatestCotisation();
    if (!latest) return { text: "Aucun paiement", color: "#ef4444", icon: <AlertTriangle size={16}/>, label: "Non réglé" };
    
    const endDate = new Date(latest.periode_couverte_fin);
    const now = new Date();
    
    if (endDate >= now) {
      return { text: "Actif", color: "#10b981", icon: <CheckCircle size={16}/>, label: "Abonnement Actif" };
    } else {
      return { text: "Expiré", color: "#f59e0b", icon: <AlertTriangle size={16}/>, label: "Renouvellement requis" };
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans transition-colors duration-300" style={{ backgroundColor: colors.bgMain }}>
        <div className="absolute top-6 left-6 z-20">
          <Link to="/" className="flex items-center gap-2 font-bold transition-colors" style={{ color: colors.textMuted }}>
            <img src="/logo.png" alt="Logo" className="h-8 rounded" />
            <span className="hidden sm:inline" style={{ color: colors.textMain }}>Retour au site</span>
          </Link>
        </div>

        <div className="w-full max-w-md" style={{ backgroundColor: colors.bgCard, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '2.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2" style={{ color: colors.textMain }}>Espace Adhérent</h1>
            <p className="text-sm" style={{ color: colors.textMuted }}>Saisissez vos informations pour vous connecter.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: colors.textMain }}>NOM DE FAMILLE</label>
              <input 
                type="text" 
                required 
                placeholder="EX: DUPONT"
                className="w-full px-4 py-3 rounded-lg border focus:outline-none transition-colors"
                style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border, color: colors.textMain }}
                value={loginData.nom}
                onChange={e => setLoginData({...loginData, nom: e.target.value.toUpperCase()})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: colors.textMain }}>PRÉNOM</label>
              <input 
                type="text" 
                required 
                placeholder="EX: Jean"
                className="w-full px-4 py-3 rounded-lg border focus:outline-none transition-colors"
                style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border, color: colors.textMain }}
                value={loginData.prenom}
                onChange={e => setLoginData({...loginData, prenom: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1" style={{ color: colors.textMain }}>DATE DE NAISSANCE</label>
              <input 
                type="date" 
                required 
                className="w-full px-4 py-3 rounded-lg border focus:outline-none transition-colors"
                style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border, color: colors.textMain }}
                value={loginData.date_naissance}
                onChange={e => setLoginData({...loginData, date_naissance: e.target.value})}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 mt-6 transition-colors"
              style={{ backgroundColor: colors.primary, color: '#ffffff', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? "Recherche..." : (
                <>Accéder à mon espace <ChevronRight size={18} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const status = getStatus();
  const latestCotis = getLatestCotisation();

  return (
    <div className="min-h-screen pb-20 font-sans transition-colors duration-300" style={{ backgroundColor: colors.bgMain }}>
      
      {/* Header plat et propre */}
      <header className="border-b" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="SC Bouira" className="h-8 rounded" />
            <span className="font-bold hidden sm:inline" style={{ color: colors.textMain }}>Sporting Club Bouira</span>
          </Link>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-colors"
            style={{ borderColor: colors.border, color: colors.textMain, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}
          >
            <LogOut size={16} /> <span className="hidden sm:inline">Déconnexion</span>
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 pt-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: colors.textMain }}>
            Bonjour, {session.prenom} 👋
          </h1>
          <p className="text-base" style={{ color: colors.textMuted }}>
            Voici les informations relatives à votre adhésion.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* COLONNE GAUCHE : IDENTIFICATION (FLAT DESIGN) */}
          <div className="lg:col-span-1">
            <div className="rounded-xl border p-6 flex flex-col items-center text-center" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
              
              <div className="w-24 h-24 rounded-full border-4 mb-4 overflow-hidden" style={{ borderColor: colors.border, backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
                {session.photo ? (
                  <img src={session.photo} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ color: colors.textMuted }}>
                    <User size={32} />
                  </div>
                )}
              </div>
              
              <h2 className="text-xl font-bold mb-1" style={{ color: colors.textMain }}>{session.prenom} {session.nom?.toUpperCase()}</h2>
              <p className="text-sm font-medium uppercase tracking-wider mb-6" style={{ color: colors.primary }}>{session.groupe || 'Membre SCB'}</p>

              <div className="w-full h-px mb-6" style={{ backgroundColor: colors.border }}></div>

              <div className="p-4 rounded-xl mb-4" style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0' }}>
                <QRCodeSVG 
                  value={session.token_qr || `NO-TOKEN-${session.id}`} 
                  size={160}
                  level="Q"
                  includeMargin={false}
                  fgColor="#000000"
                />
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: colors.textMuted }}>Carte Numérique à scanner</p>
              
            </div>
          </div>

          {/* COLONNE DROITE : STATUT ET HISTORIQUE */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Cartes de Statut */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-xl border p-6" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                <div className="flex items-center gap-3 mb-4">
                  <Shield size={20} style={{ color: colors.textMuted }} />
                  <h3 className="font-semibold" style={{ color: colors.textMuted }}>Statut Abonnement</h3>
                </div>
                <div className="text-xl font-bold mb-1" style={{ color: status.color }}>{status.label}</div>
                <p className="text-sm" style={{ color: colors.textMain }}>
                  Valable jusqu'au {latestCotis ? new Date(latestCotis.periode_couverte_fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                </p>
              </div>

              <div className="rounded-xl border p-6" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                <div className="flex items-center gap-3 mb-4">
                  <Activity size={20} style={{ color: colors.textMuted }} />
                  <h3 className="font-semibold" style={{ color: colors.textMuted }}>Dernier passage</h3>
                </div>
                <div className="text-xl font-bold mb-1" style={{ color: colors.textMain }}>Aujourd'hui</div>
                <p className="text-sm" style={{ color: colors.textMuted }}>Entrée validée à 17h30</p>
              </div>
            </div>

            {/* Historique des paiements */}
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
              <div className="p-6 border-b flex items-center gap-3" style={{ borderColor: colors.border }}>
                <CreditCard size={20} style={{ color: colors.textMuted }} />
                <h3 className="text-lg font-bold" style={{ color: colors.textMain }}>Historique de paiements</h3>
              </div>
              
              <div className="p-0">
                {!session.cotisations || session.cotisations.length === 0 ? (
                  <div className="p-8 text-center" style={{ color: colors.textMuted }}>
                    Aucun paiement enregistré pour le moment.
                  </div>
                ) : (
                  <ul className="divide-y" style={{ divideColor: colors.border }}>
                    {[...session.cotisations]
                      .sort((a, b) => new Date(b.date_paiement) - new Date(a.date_paiement))
                      .map((cotis) => (
                      <li key={cotis.id} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg flex flex-col items-center justify-center border" style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: colors.border, color: colors.textMain }}>
                            <span className="text-xs font-bold uppercase">{new Date(cotis.periode_couverte_fin).toLocaleString('fr-FR', { month: 'short' })}</span>
                            <span className="text-[10px]" style={{ color: colors.textMuted }}>{new Date(cotis.periode_couverte_fin).getFullYear()}</span>
                          </div>
                          <div>
                            <div className="font-bold text-base" style={{ color: colors.textMain }}>Abonnement Mensuel</div>
                            <div className="text-sm flex items-center gap-2 mt-0.5" style={{ color: colors.textMuted }}>
                              <span>Payé le {new Date(cotis.date_paiement).toLocaleDateString('fr-FR')}</span>
                              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: colors.textMuted }}></span>
                              <span className="font-medium">{cotis.mode_paiement}</span>
                            </div>
                          </div>
                        </div>
                        <div className="sm:text-right flex sm:flex-col justify-between sm:justify-start items-center sm:items-end">
                          <div className="font-extrabold text-lg" style={{ color: colors.textMain }}>
                            {Number(cotis.montant_paye).toLocaleString('fr-DZ')} DA
                          </div>
                          <div className="text-xs font-medium flex items-center gap-1 mt-0.5" style={{ color: '#10b981' }}>
                            <CheckCircle size={12} /> Réglé
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
