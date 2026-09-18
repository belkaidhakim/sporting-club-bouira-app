import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { 
  LogOut, CreditCard, Activity, CheckCircle, AlertTriangle, 
  User, Shield, ChevronRight, Phone, Calendar, Megaphone,
  TrendingUp, Timer, Award, FileText, Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import { SWIMMING_EVENTS } from '../utils/swimmingCategories';

const translations = {
  fr: {
    loginTitle: 'Espace Adhérent',
    loginSubtitle: 'Accédez à votre carte d\'accès et vos performances',
    identifiant: 'MATRICULE OU TÉLÉPHONE',
    identifiantPlaceholder: 'Ex: SCB-1234 ou 0555...',
    pin: 'CODE PIN (DATE DE NAISSANCE)',
    loginBtn: 'Se connecter',
    support: 'Un problème de connexion ?',
    contactAdmin: 'Contactez l\'administration',
    welcome: 'Bonjour',
    dashboard: 'Tableau de bord',
    performances: 'Mes Chronos',
    announcements: 'Annonces Club',
    logout: 'Déconnexion',
    status: 'Statut Abonnement',
    medical: 'Certificat Médical',
    digitalCard: 'Carte Numérique',
    validUntil: 'Valable jusqu\'au',
    noPayment: 'Aucun paiement',
    expired: 'Expiré',
    active: 'Actif',
    valid: 'Valide',
    invalid: 'Non fourni ou expiré',
    history: 'Historique de paiements',
    noHistory: 'Aucun paiement enregistré.',
    paidOn: 'Payé le',
    amount: 'Montant',
    clubNotes: 'Notes du club',
    noNotes: 'Aucune annonce pour le moment.',
    perfTitle: 'Évolution de vos performances',
    noPerf: 'Aucun chrono enregistré. Entraînez-vous dur !',
    event: 'Épreuve',
    bestTime: 'Meilleur Temps (PB)'
  },
  ar: {
    loginTitle: 'فضاء المنخرط',
    loginSubtitle: 'قم بالوصول إلى بطاقة الدخول الخاصة بك وأدائك',
    identifiant: 'رقم التسجيل أو الهاتف',
    identifiantPlaceholder: 'مثال: SCB-1234 أو 0555...',
    pin: 'الرمز السري (تاريخ الميلاد)',
    loginBtn: 'تسجيل الدخول',
    support: 'مشكلة في الاتصال؟',
    contactAdmin: 'اتصل بالإدارة',
    welcome: 'مرحباً',
    dashboard: 'لوحة القيادة',
    performances: 'أدائي (الكرونو)',
    announcements: 'إعلانات النادي',
    logout: 'تسجيل الخروج',
    status: 'حالة الاشتراك',
    medical: 'الشهادة الطبية',
    digitalCard: 'البطاقة الرقمية',
    validUntil: 'صالح حتى',
    noPayment: 'لا يوجد دفع',
    expired: 'منتهي الصلاحية',
    active: 'نشط',
    valid: 'صالح',
    invalid: 'غير متوفر أو منتهي',
    history: 'سجل المدفوعات',
    noHistory: 'لا توجد مدفوعات مسجلة.',
    paidOn: 'تم الدفع في',
    amount: 'المبلغ',
    clubNotes: 'ملاحظات النادي',
    noNotes: 'لا توجد إعلانات في الوقت الحالي.',
    perfTitle: 'تطور أدائك',
    noPerf: 'لم يتم تسجيل أي وقت بعد. تدرب بجد!',
    event: 'التخصص',
    bestTime: 'أفضل وقت (PB)'
  }
};

export default function MemberPortal() {
  const [lang, setLang] = useState('fr');
  const t = translations[lang] || translations['fr'];

  const [session, setSession] = useState(() => {
    try {
      const stored = localStorage.getItem('member_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [loginData, setLoginData] = useState({ identifiant: '', date_naissance: '' });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [performances, setPerformances] = useState([]);
  const [renderError, setRenderError] = useState(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const colors = {
    bgMain: isDark ? '#0f172a' : '#f8fafc',
    bgCard: isDark ? '#1e293b' : '#ffffff',
    textMain: isDark ? '#f8fafc' : '#0f172a',
    textMuted: isDark ? '#94a3b8' : '#64748b',
    border: isDark ? '#334155' : '#e2e8f0',
    primary: '#38bdf8',
    primaryHover: '#0284c7',
  };

  useEffect(() => {
    if (session?.id) {
      fetchAthleteData(session.id);
      loadPerformances(session.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPerformances = (athleteId) => {
    try {
      const localSwim = localStorage.getItem(`scb_athlete_perfs_${athleteId}`);
      if (localSwim) {
        const parsed = JSON.parse(localSwim);
        if (Array.isArray(parsed)) {
          setPerformances(parsed);
        } else {
          setPerformances([]);
        }
      }
    } catch (e) {
      setPerformances([]);
    }
  };

  const fetchAthleteData = async (athleteId) => {
    try {
      const { data } = await supabase
        .from('athletes')
        .select(`*, cotisations (*), cartes_acces (*)`)
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
    setRenderError(null);
    try {
      const { data, error } = await supabase
        .from('athletes')
        .select(`*, cotisations (*), cartes_acces (*)`)
        .eq('date_naissance', loginData.date_naissance);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const ident = String(loginData.identifiant).toLowerCase().trim();
        const identNoSpace = ident.replace(/\s+/g, '');
        
        const matched = data.find(a => 
          (a.token_qr && String(a.token_qr).toLowerCase() === ident) ||
          (a.telephone && String(a.telephone).replace(/\s+/g, '') === identNoSpace) ||
          (a.telephone_tuteur && String(a.telephone_tuteur).replace(/\s+/g, '') === identNoSpace) ||
          (a.nom && String(a.nom).toLowerCase() === ident)
        );

        if (matched) {
          setSession(matched);
          localStorage.setItem('member_session', JSON.stringify(matched));
          loadPerformances(matched.id);
          toast.success(`${t.welcome} ${matched.prenom} !`);
        } else {
          toast.error("Identifiant incorrect pour cette date de naissance.");
        }
      } else {
        toast.error("Aucun dossier ne correspond à ce code PIN (Date).");
      }
    } catch (err) {
      toast.error("Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setRenderError(null);
    localStorage.removeItem('member_session');
    setPerformances([]);
  };

  const safeFormatDate = (dateStr, options) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      if (options) return d.toLocaleString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', options);
      return d.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-FR');
    } catch {
      return '-';
    }
  };

  // Safe data extraction
  let status = { color: "#ef4444", icon: <AlertTriangle size={16}/>, label: t.noPayment, ok: false };
  let medStatus = { color: "#f59e0b", icon: <AlertTriangle size={16}/>, label: t.invalid, ok: false };
  let latestCotis = null;
  let cotisationsList = [];

  try {
    if (session) {
      cotisationsList = Array.isArray(session.cotisations) ? session.cotisations : [];
      if (cotisationsList.length > 0) {
        latestCotis = [...cotisationsList].sort((a, b) => {
          const dA = new Date(a.date_paiement || 0).getTime() || 0;
          const dB = new Date(b.date_paiement || 0).getTime() || 0;
          return dB - dA;
        })[0];
      }

      if (latestCotis && latestCotis.periode_couverte_fin) {
        const endDate = new Date(latestCotis.periode_couverte_fin);
        if (!isNaN(endDate.getTime())) {
          if (endDate >= new Date()) {
            status = { color: "#10b981", icon: <CheckCircle size={16}/>, label: t.active, ok: true };
          } else {
            status = { color: "#ef4444", icon: <AlertTriangle size={16}/>, label: t.expired, ok: false };
          }
        }
      }

      if (session.certificat_medical) {
        medStatus = { color: "#10b981", icon: <CheckCircle size={16}/>, label: t.valid, ok: true };
      }
    }
  } catch (err) {
    console.error("Error processing session data:", err);
    if (!renderError) setRenderError(err.message);
  }

  const chartData = useMemo(() => {
    try {
      if (!Array.isArray(performances) || performances.length === 0) return [];
      
      const eventCounts = {};
      performances.forEach(p => {
        if (p && p.event_id) eventCounts[p.event_id] = (eventCounts[p.event_id] || 0) + 1;
      });

      const keys = Object.keys(eventCounts);
      if (keys.length === 0) return [];

      const topEventId = keys.sort((a, b) => eventCounts[b] - eventCounts[a])[0];

      const perfs = performances
        .filter(p => p && p.event_id === topEventId)
        .sort((a, b) => {
          const dA = new Date(a.date_perf || 0).getTime() || 0;
          const dB = new Date(b.date_perf || 0).getTime() || 0;
          return dA - dB;
        });
      
      return perfs.map(p => {
        let dStr = '-';
        try {
          const d = new Date(p.date_perf);
          if (!isNaN(d.getTime())) {
            dStr = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
          }
        } catch {}
        return {
          date: dStr,
          temps: Number(p.seconds) || 0,
          chrono: String(p.chrono_str || '-'),
          label: String(p.event_label || topEventId)
        };
      });
    } catch(err) {
      console.error("Error processing chart data:", err);
      return [];
    }
  }, [performances]);

  // Escape hatch si le rendu crashe à cause de données corrompues en cache
  if (renderError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white">
        <AlertTriangle size={48} className="text-rose-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Données de session corrompues</h1>
        <p className="text-slate-400 mb-6 max-w-md text-center">Une erreur s'est produite lors de la lecture de vos données locales. Veuillez vous déconnecter pour purger le cache.</p>
        <button onClick={handleLogout} className="px-6 py-3 bg-rose-500 rounded-lg font-bold">Réparer et Déconnecter</button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 font-sans relative" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="absolute inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1519315901367-f34ff9154487?q=80&w=2000&auto=format&fit=crop')", filter: "brightness(0.3) saturate(1.2)" }} />
        <div className="absolute top-6 right-6 z-20 flex gap-2">
           <button onClick={() => setLang('fr')} className={`px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-md border transition-all ${lang === 'fr' ? 'bg-sky-500 text-white border-sky-400' : 'bg-white/10 text-white/70 border-white/20'}`}>FR</button>
           <button onClick={() => setLang('ar')} className={`px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-md border transition-all ${lang === 'ar' ? 'bg-sky-500 text-white border-sky-400' : 'bg-white/10 text-white/70 border-white/20'}`}>العربية</button>
        </div>
        <div className="absolute top-6 left-6 z-20">
          <Link to="/" className="flex items-center gap-2 font-bold text-white/70 hover:text-white transition-colors">
            <span className="hidden sm:inline">← {lang === 'ar' ? 'العودة للموقع' : 'Retour au site'}</span>
          </Link>
        </div>

        <div className="w-full max-w-md relative z-10 p-8 rounded-3xl backdrop-blur-xl bg-black/40 border border-white/10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-sky-500 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Waves color="white" size={40} />
            </div>
            <h1 className="text-3xl font-extrabold mb-2 text-white">{t.loginTitle}</h1>
            <p className="text-sm text-sky-200/80">{t.loginSubtitle}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-white/80 tracking-wider">{t.identifiant}</label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}><User size={18} className="text-white/40" /></div>
                <input type="text" required placeholder={t.identifiantPlaceholder} className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 rounded-xl focus:outline-none transition-all text-white font-medium`} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} value={loginData.identifiant} onChange={e => setLoginData({...loginData, identifiant: e.target.value})} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-white/80 tracking-wider">{t.pin}</label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${lang === 'ar' ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}><Calendar size={18} className="text-white/40" /></div>
                <input type="date" required className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-3 rounded-xl focus:outline-none transition-all text-white font-medium`} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }} value={loginData.date_naissance} onChange={e => setLoginData({...loginData, date_naissance: e.target.value})} />
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 mt-8 transition-all hover:scale-[1.02] active:scale-95" style={{ backgroundColor: colors.primary, color: '#ffffff', opacity: loading ? 0.7 : 1, boxShadow: '0 10px 25px -5px rgba(56, 189, 248, 0.4)' }}>
              {loading ? "Recherche..." : <>{t.loginBtn} {lang === 'fr' && <ChevronRight size={18} />}</>}
            </button>
          </form>
          <div className="mt-8 text-center border-t border-white/10 pt-6">
            <p className="text-xs text-white/50 mb-2">{t.support}</p>
            <a href="https://wa.me/213555000000" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 text-sm font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
              <Phone size={16} /> {t.contactAdmin}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 font-sans transition-colors duration-300" style={{ backgroundColor: colors.bgMain }} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="border-b shadow-sm sticky top-0 z-50 backdrop-blur-lg" style={{ backgroundColor: `${colors.bgCard}e6`, borderColor: colors.border }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center shadow-md"><Waves color="white" size={18} /></div>
            <span className="font-extrabold text-lg hidden sm:inline" style={{ color: colors.textMain }}>SCB Adhérent</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg border border-[var(--border-color)]">
               <button onClick={() => setLang('fr')} className={`px-2 py-1 rounded text-xs font-bold transition-all ${lang === 'fr' ? 'bg-sky-500 text-white' : 'text-muted'}`}>FR</button>
               <button onClick={() => setLang('ar')} className={`px-2 py-1 rounded text-xs font-bold transition-all ${lang === 'ar' ? 'bg-sky-500 text-white' : 'text-muted'}`}>AR</button>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg border hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-colors" style={{ borderColor: colors.border, color: colors.textMuted }}>
              <LogOut size={16} /> <span className="hidden sm:inline">{t.logout}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 mt-8">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 scrollbar-none border-b border-[var(--border-color)]">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2.5 rounded-t-xl font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'dashboard' ? 'text-sky-500 border-b-2 border-sky-500 bg-sky-500/10' : 'text-muted hover:bg-black/5'}`}>
            <User size={18} /> {t.dashboard}
          </button>
          <button onClick={() => setActiveTab('performances')} className={`px-4 py-2.5 rounded-t-xl font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'performances' ? 'text-sky-500 border-b-2 border-sky-500 bg-sky-500/10' : 'text-muted hover:bg-black/5'}`}>
            <TrendingUp size={18} /> {t.performances}
          </button>
          <button onClick={() => setActiveTab('announcements')} className={`px-4 py-2.5 rounded-t-xl font-bold text-sm flex items-center gap-2 transition-colors ${activeTab === 'announcements' ? 'text-sky-500 border-b-2 border-sky-500 bg-sky-500/10' : 'text-muted hover:bg-black/5'}`}>
            <Megaphone size={18} /> {t.announcements}
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="rounded-2xl border p-6 flex flex-col items-center text-center shadow-sm relative overflow-hidden" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-sky-400 to-blue-500"></div>
                <div className="w-24 h-24 rounded-full border-4 relative z-10 mb-4 bg-white shadow-lg overflow-hidden flex items-center justify-center" style={{ borderColor: colors.bgCard }}>
                  {session.photo ? <img src={session.photo} alt="Profil" className="w-full h-full object-cover" /> : <User size={40} className="text-slate-300" />}
                </div>
                <h2 className="text-2xl font-extrabold mb-1" style={{ color: colors.textMain }}>
                  {String(session.prenom || '')} {String(session.nom || '').toUpperCase()}
                </h2>
                <p className="text-sm font-bold uppercase tracking-wider mb-6 text-sky-500">{String(session.groupe || 'Membre SCB')}</p>
                <div className="p-4 rounded-2xl mb-4 bg-white border-2 border-slate-100 shadow-inner inline-block">
                  <QRCodeSVG value={String(session.token_qr || `NO-TOKEN-${session.id || '0'}`)} size={180} level="H" includeMargin={false} fgColor="#0f172a" />
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 justify-center"><Globe size={14} /> {t.digitalCard}</p>
                <div className="mt-2 font-mono text-sm font-bold text-slate-400">{String(session.token_qr || '-')}</div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border p-5 relative overflow-hidden" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                  <div className={`absolute top-0 right-0 w-2 h-full ${status.ok ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-xl ${status.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}><Shield size={20} /></div>
                    <h3 className="font-bold" style={{ color: colors.textMuted }}>{t.status}</h3>
                  </div>
                  <div className={`text-2xl font-extrabold mb-1 ${status.ok ? 'text-emerald-500' : 'text-rose-500'}`}>{status.label}</div>
                  <p className="text-sm font-medium" style={{ color: colors.textMain }}>
                    {t.validUntil} {latestCotis ? safeFormatDate(latestCotis.periode_couverte_fin, { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                  </p>
                </div>
                <div className="rounded-2xl border p-5 relative overflow-hidden" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                  <div className={`absolute top-0 right-0 w-2 h-full ${medStatus.ok ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-xl ${medStatus.ok ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}><FileText size={20} /></div>
                    <h3 className="font-bold" style={{ color: colors.textMuted }}>{t.medical}</h3>
                  </div>
                  <div className={`text-2xl font-extrabold mb-1 ${medStatus.ok ? 'text-emerald-500' : 'text-amber-500'}`}>{medStatus.label}</div>
                  <p className="text-sm font-medium" style={{ color: colors.textMain }}>
                    {session.certificat_medical ? 'Document validé' : 'Veuillez déposer votre certificat'}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
                <div className="p-5 border-b flex items-center gap-3" style={{ borderColor: colors.border }}>
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500"><CreditCard size={18} /></div>
                  <h3 className="text-lg font-bold" style={{ color: colors.textMain }}>{t.history}</h3>
                </div>
                <div className="p-0">
                  {cotisationsList.length === 0 ? (
                    <div className="p-8 text-center font-medium" style={{ color: colors.textMuted }}>{t.noHistory}</div>
                  ) : (
                    <ul className="divide-y" style={{ divideColor: colors.border }}>
                      {[...cotisationsList].sort((a, b) => {
                        const dA = new Date(a.date_paiement || 0).getTime() || 0;
                        const dB = new Date(b.date_paiement || 0).getTime() || 0;
                        return dB - dA;
                      }).map((cotis) => (
                        <li key={cotis.id || Math.random()} className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-500/5 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center border bg-[var(--bg-tertiary)] border-[var(--border-color)]">
                              <span className="text-xs font-extrabold uppercase">{safeFormatDate(cotis.periode_couverte_fin, { month: 'short' })}</span>
                              <span className="text-[10px] text-muted">{safeFormatDate(cotis.periode_couverte_fin, { year: 'numeric' })}</span>
                            </div>
                            <div>
                              <div className="font-bold text-base" style={{ color: colors.textMain }}>Abonnement Mensuel</div>
                              <div className="text-sm flex items-center gap-2 mt-0.5 text-muted font-medium">
                                <span>{t.paidOn} {safeFormatDate(cotis.date_paiement)}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`sm:text-${lang === 'ar' ? 'left' : 'right'} flex sm:flex-col justify-between sm:justify-start items-center sm:items-end`}>
                            <div className="font-extrabold text-lg text-[var(--text-primary)]">
                              {Number(cotis.montant_paye || 0).toLocaleString('fr-DZ')} DA
                            </div>
                            <div className="text-xs font-bold flex items-center gap-1 mt-0.5 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
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
        )}

        {activeTab === 'performances' && (
          <div className="space-y-6">
            <div className="rounded-2xl border p-6" style={{ backgroundColor: colors.bgCard, borderColor: colors.border }}>
              <h3 className="text-xl font-extrabold mb-4 text-[var(--text-primary)] flex items-center gap-2">
                <Timer className="text-sky-500" /> {t.perfTitle}
              </h3>
              {chartData.length > 0 ? (
                <div>
                  <p className="text-sm text-muted font-medium mb-6">{t.event}: <strong className="text-sky-500">{chartData[0].label}</strong></p>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} vertical={false} />
                      <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                      <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: 'none', borderRadius: '12px', color: '#fff' }} />
                      <Line type="monotone" dataKey="temps" stroke="#38bdf8" strokeWidth={4} dot={{ r: 6, fill: '#38bdf8' }} activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-xl border-[var(--border-color)] text-muted font-bold">{t.noPerf}</div>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {['50_NL', '100_NL', '50_DOS', '50_PAP'].map(eventId => {
                 const ev = SWIMMING_EVENTS.find(e => e.id === eventId);
                 if (!ev || !Array.isArray(performances)) return null;
                 const perfs = performances.filter(p => p && p.event_id === eventId).sort((a,b) => (Number(a.seconds) || 0) - (Number(b.seconds) || 0));
                 if (perfs.length === 0) return null;
                 return (
                   <div key={eventId} className="p-4 rounded-xl border bg-[var(--bg-tertiary)] border-[var(--border-color)]">
                     <span className="text-xs font-bold text-muted uppercase">{ev.shortLabel}</span>
                     <div className="text-lg font-extrabold text-emerald-500 mt-1">{String(perfs[0].chrono_str || '-')}</div>
                     <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-1.5 rounded-sm uppercase font-bold">PB</span>
                   </div>
                 );
               })}
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="space-y-4">
            <div className="rounded-2xl border p-6 border-sky-500/30 bg-sky-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-sky-500 text-white rounded-2xl shadow-lg shadow-sky-500/30"><Megaphone size={24} /></div>
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--text-primary)]">Bienvenue sur votre nouvel espace !</h3>
                  <p className="text-sm font-medium text-muted mt-1">Le portail vient d'être mis à jour. Vous pouvez désormais présenter votre carte virtuelle (QR) directement depuis votre smartphone pour accéder aux bassins.</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-2xl border p-6 border-amber-500/30 bg-amber-500/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-500/30"><Award size={24} /></div>
                <div>
                  <h3 className="text-lg font-extrabold text-[var(--text-primary)]">Compétition de Wilaya</h3>
                  <p className="text-sm font-medium text-muted mt-1">Les convocations pour le prochain meeting seront bientôt affichées ici. Gardez un œil sur vos performances !</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
