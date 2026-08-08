import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { CreditCard, TrendingUp, Search, Download, AlertTriangle, FileText, Edit, TrendingDown, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { z } from 'zod';
import { useCotisations } from '../hooks/useCotisations';
import { useDepenses } from '../hooks/useDepenses';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Skeleton } from '../components/ui';

const paymentSchema = z.object({
  athlete_id: z.string().min(1, 'Veuillez sélectionner un athlète'),
  montant_paye: z.preprocess((val) => Number(val), z.number().positive('Le montant doit être supérieur à 0')),
  mode_paiement: z.enum(['Espèces', 'Virement', 'Chèque']),
  periode_couverte_fin: z.string().min(1, 'Veuillez sélectionner une date de fin'),
});

const depenseSchema = z.object({
  montant: z.preprocess((val) => Number(val), z.number().positive('Le montant doit être supérieur à 0')),
  description: z.string().min(2, 'Description requise'),
  categorie: z.enum(['Équipement', 'Salaire', 'Loyer', 'Événement', 'Autre']),
  date_depense: z.string().min(1, 'Date requise'),
});

export default function FinancialDashboard() {
  const { cotisations, loading: cotisLoading, fetchCotisations } = useCotisations();
  const { depenses, loading: depensesLoading, fetchDepenses } = useDepenses();
  const { user } = useAuth();
  
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('revenus'); // 'revenus' or 'depenses'
  
  // Cotisation Form State
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const initialFormState = {
    athlete_id: '',
    montant_paye: '',
    mode_paiement: 'Virement',
    periode_couverte_fin: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  
  // Depense Form State
  const [showDepenseForm, setShowDepenseForm] = useState(false);
  const initialDepenseState = {
    montant: '',
    description: '',
    categorie: 'Équipement',
    date_depense: new Date().toISOString().split('T')[0]
  };
  const [depenseData, setDepenseData] = useState(initialDepenseState);
  
  // Filters
  const [searchName, setSearchName] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchCotisations();
    fetchDepenses();
    fetchAthletes();
  }, [fetchCotisations, fetchDepenses]);

  const filteredCotisations = useMemo(() => {
    let result = [...cotisations];
    if (searchName) {
      result = result.filter(c => 
        c.athletes?.nom?.toLowerCase().includes(searchName.toLowerCase()) || 
        c.athletes?.prenom?.toLowerCase().includes(searchName.toLowerCase())
      );
    }
    if (filterMonth !== 'all') {
      result = result.filter(c => new Date(c.date_paiement).getMonth() === parseInt(filterMonth));
    }
    if (filterYear !== 'all') {
      result = result.filter(c => new Date(c.date_paiement).getFullYear() === parseInt(filterYear));
    }
    return result;
  }, [cotisations, searchName, filterMonth, filterYear]);
  
  const filteredDepenses = useMemo(() => {
    let result = [...depenses];
    if (searchName) {
      result = result.filter(d => d.description.toLowerCase().includes(searchName.toLowerCase()));
    }
    if (filterMonth !== 'all') {
      result = result.filter(d => new Date(d.date_depense).getMonth() === parseInt(filterMonth));
    }
    if (filterYear !== 'all') {
      result = result.filter(d => new Date(d.date_depense).getFullYear() === parseInt(filterYear));
    }
    return result;
  }, [depenses, searchName, filterMonth, filterYear]);

  const stats = useMemo(() => {
    const totalRev = cotisations.reduce((sum, c) => sum + Number(c.montant_paye), 0);
    const totalDep = depenses.reduce((sum, d) => sum + Number(d.montant), 0);
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthRev = cotisations
      .filter(c => {
        const date = new Date(c.date_paiement);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, c) => sum + Number(c.montant_paye), 0);
      
    const thisMonthDep = depenses
      .filter(d => {
        const date = new Date(d.date_depense);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, d) => sum + Number(d.montant), 0);
      
    return { 
      totalRevenue: totalRev, 
      totalThisMonth: thisMonthRev,
      totalDepenses: totalDep,
      depensesThisMonth: thisMonthDep,
      beneficeNet: totalRev - totalDep,
      beneficeThisMonth: thisMonthRev - thisMonthDep
    };
  }, [cotisations, depenses]);

  const chartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    const currentYearDataCotis = cotisations.filter(c => new Date(c.date_paiement).getFullYear() === currentYear);
    const currentYearDataDep = depenses.filter(d => new Date(d.date_depense).getFullYear() === currentYear);
    
    const monthlyRevenues = Array(12).fill(0);
    const monthlyDepenses = Array(12).fill(0);
    
    currentYearDataCotis.forEach(c => {
      const m = new Date(c.date_paiement).getMonth();
      monthlyRevenues[m] += Number(c.montant_paye);
    });
    
    currentYearDataDep.forEach(d => {
      const m = new Date(d.date_depense).getMonth();
      monthlyDepenses[m] += Number(d.montant);
    });
    
    return months.map((month, index) => ({ 
      name: month, 
      Revenus: monthlyRevenues[index],
      Dépenses: monthlyDepenses[index]
    }));
  }, [cotisations, depenses]);

  async function fetchAthletes() {
    try {
      setLoading(true);
      const { data: athletesData, error: athError } = await supabase
        .from('athletes')
        .select('id, nom, prenom')
        .eq('est_actif', true)
        .order('nom', { ascending: true });
        
      if (athError) throw athError;
      setAthletes(athletesData || []);
    } catch (error) {
      console.error('Error fetching athletes:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // --- Handlers for Cotisations ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      paymentSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) { toast.error(err.errors[0].message); return; }
    }
    try {
      setLoading(true);
      if (editingPaymentId) {
        const { error } = await supabase.from('cotisations').update(formData).eq('id', editingPaymentId);
        if (error) throw error;
        toast.success('Paiement modifié !');
      } else {
        const { error } = await supabase.from('cotisations').insert([formData]);
        if (error) throw error;
        toast.success('Paiement enregistré !');
      }
      setShowPaymentForm(false);
      setEditingPaymentId(null);
      setFormData(initialFormState);
      fetchCotisations();
    } catch (error) {
      toast.error('Erreur : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (cotis) => {
    setFormData({
      athlete_id: cotis.athlete_id,
      montant_paye: cotis.montant_paye,
      mode_paiement: cotis.mode_paiement,
      periode_couverte_fin: cotis.periode_couverte_fin ? new Date(cotis.periode_couverte_fin).toISOString().split('T')[0] : ''
    });
    setEditingPaymentId(cotis.id);
    setActiveTab('revenus');
    setShowPaymentForm(true);
    setShowDepenseForm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Handlers for Dépenses ---
  const handleDepenseSubmit = async (e) => {
    e.preventDefault();
    try {
      depenseSchema.parse(depenseData);
    } catch (err) {
      if (err instanceof z.ZodError) { toast.error(err.errors[0].message); return; }
    }
    try {
      setLoading(true);
      const { error } = await supabase.from('depenses').insert([{
        ...depenseData,
        created_by: user?.id
      }]);
      if (error) throw error;
      toast.success('Dépense enregistrée !');
      setShowDepenseForm(false);
      setDepenseData(initialDepenseState);
      fetchDepenses();
    } catch (error) {
      toast.error('Erreur : ' + error.message);
    } finally {
      setLoading(false);
    }
  };


  const checkExpirations = async () => {
    setLoading(true);
    try {
      const { data: cards, error: cardsError } = await supabase.from('cartes_acces').select('athlete_id, statut').eq('statut', 'ACTIVE');
      if (cardsError) throw cardsError;

      let expiredCount = 0;
      const now = new Date();

      for (const card of cards) {
        const { data: cotis } = await supabase
          .from('cotisations').select('periode_couverte_fin').eq('athlete_id', card.athlete_id).order('periode_couverte_fin', { ascending: false }).limit(1);

        if (cotis && cotis.length > 0) {
          const endDate = new Date(cotis[0].periode_couverte_fin);
          if (endDate < now) {
            await supabase.from('cartes_acces').update({ statut: 'EXPIREE' }).eq('athlete_id', card.athlete_id);
            expiredCount++;
          }
        }
      }
      if (expiredCount > 0) toast.success(`${expiredCount} cartes ont été expirées.`);
      else toast.success("Aucune expiration détectée.");
    } catch (error) {
      toast.error("Erreur lors de la vérification.");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    let headers, rows, filename;
    
    if (activeTab === 'revenus') {
      headers = ['Date', 'Membre', 'Montant (DZ)', 'Mode de paiement', 'Date de fin couverte'];
      rows = filteredCotisations.map(c => [
        new Date(c.date_paiement).toLocaleDateString('fr-FR'),
        `${c.athletes?.nom} ${c.athletes?.prenom}`,
        c.montant_paye,
        c.mode_paiement,
        new Date(c.periode_couverte_fin).toLocaleDateString('fr-FR')
      ]);
      filename = `revenus_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      headers = ['Date', 'Description', 'Catégorie', 'Montant (DZ)'];
      rows = filteredDepenses.map(d => [
        new Date(d.date_depense).toLocaleDateString('fr-FR'),
        d.description,
        d.categorie,
        d.montant
      ]);
      filename = `depenses_${new Date().toISOString().split('T')[0]}.csv`;
    }
    
    const BOM = "\uFEFF";
    let csvContent = BOM + headers.join(";") + "\n" + rows.map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePDFReceipt = (cotisation) => {
    const doc = new jsPDF();
    doc.setFontSize(22); doc.setTextColor(59, 130, 246); doc.text("CLUB SPORTS", 20, 20);
    doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text("Reçu de paiement de cotisation", 20, 28);
    doc.line(20, 35, 190, 35);
    doc.setFontSize(12); doc.setTextColor(30, 41, 59);
    doc.text(`Date : ${new Date(cotisation.date_paiement).toLocaleDateString('fr-FR')}`, 20, 50);
    doc.text(`Reçu N° : ${cotisation.id.substring(0, 8).toUpperCase()}`, 130, 50);
    doc.setFontSize(14); doc.text("Membre :", 20, 70);
    doc.setFontSize(12); doc.text(`${cotisation.athletes.nom.toUpperCase()} ${cotisation.athletes.prenom}`, 20, 80);
    doc.setFillColor(248, 250, 252); doc.rect(20, 100, 170, 60, 'F');
    doc.text(`Montant payé :`, 30, 120);
    doc.setFontSize(16); doc.setTextColor(16, 185, 129); doc.text(`${cotisation.montant_paye} DZ`, 150, 120);
    doc.setFontSize(12); doc.setTextColor(30, 41, 59);
    doc.text(`Mode de paiement : ${cotisation.mode_paiement}`, 30, 135);
    doc.text(`Couverture jusqu'au : ${new Date(cotisation.periode_couverte_fin).toLocaleDateString('fr-FR')}`, 30, 150);
    doc.setFontSize(10); doc.setTextColor(100, 116, 139); doc.text("Ce reçu atteste du paiement de la cotisation.", 20, 270);
    doc.save(`Reçu_${cotisation.athletes.nom}_${new Date(cotisation.date_paiement).toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1>Tableau de bord financier</h1>
          <p>Suivez vos revenus, vos dépenses et calculez vos bénéfices.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={checkExpirations}>
            <AlertTriangle size={18} className="text-warning" /> Expirations
          </Button>
          <Button variant="danger" onClick={() => { setShowDepenseForm(true); setShowPaymentForm(false); }}>
            - Dépense
          </Button>
          <Button variant="primary" onClick={() => { setShowPaymentForm(true); setShowDepenseForm(false); setEditingPaymentId(null); setFormData(initialFormState); }}>
            + Revenu
          </Button>
        </div>
      </div>

      {/* TOP KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-muted mb-0">Total Revenus</h3>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Outfit', color: 'var(--accent-success)' }}>
            + {stats.totalRevenue} DZ
          </div>
          <div className="text-xs text-muted">Ce mois: +{stats.totalThisMonth} DZ</div>
        </Card>

        <Card className="flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-muted mb-0">Total Dépenses</h3>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)' }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Outfit', color: 'var(--accent-danger)' }}>
            - {stats.totalDepenses} DZ
          </div>
          <div className="text-xs text-muted">Ce mois: -{stats.depensesThisMonth} DZ</div>
        </Card>
        
        <Card className="flex-col gap-4" style={{ border: '2px solid rgba(56, 189, 248, 0.2)' }}>
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-muted mb-0">Bénéfice Net</h3>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Outfit', color: stats.beneficeNet >= 0 ? 'white' : 'var(--accent-danger)' }}>
            {stats.beneficeNet} DZ
          </div>
          <div className="text-xs text-muted">Ce mois: {stats.beneficeThisMonth} DZ</div>
        </Card>
      </div>

      {/* CHART */}
      <Card className="mb-8 p-4">
        <h3 className="text-sm font-semibold text-muted mb-4">Évolution Financière ({new Date().getFullYear()})</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
              />
              <Legend />
              <Bar dataKey="Revenus" fill="var(--accent-success)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Dépenses" fill="var(--accent-danger)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-muted py-10">Aucune donnée</div>
        )}
      </Card>

      {/* FORMS */}
      {showPaymentForm && (
        <Card className="mb-8 p-6" style={{ borderTop: '4px solid var(--accent-success)' }}>
          <h2 className="mb-4">{editingPaymentId ? 'Modifier un Revenu (Cotisation)' : 'Enregistrer un Revenu'}</h2>
          <form onSubmit={handlePaymentSubmit}>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="form-group">
                <label className="form-label">Athlète *</label>
                <select name="athlete_id" value={formData.athlete_id} onChange={handleChange} className="form-select" required>
                  <option value="">Sélectionner un athlète</option>
                  {athletes.map(a => <option key={a.id} value={a.id}>{a.nom} {a.prenom}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Montant encaissé (DZ) *</label>
                <input type="number" step="0.01" name="montant_paye" value={formData.montant_paye} onChange={handleChange} className="form-input" required />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="form-group">
                <label className="form-label">Mode de paiement *</label>
                <select name="mode_paiement" value={formData.mode_paiement} onChange={handleChange} className="form-select" required>
                  <option value="Espèces">Espèces</option>
                  <option value="Virement">Virement</option>
                  <option value="Chèque">Chèque</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Couvre jusqu'au (Date fin) *</label>
                <input type="date" name="periode_couverte_fin" value={formData.periode_couverte_fin} onChange={handleChange} className="form-input" required />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-2">
              <Button type="button" variant="secondary" onClick={() => setShowPaymentForm(false)}>Annuler</Button>
              <Button type="submit" variant="primary">{editingPaymentId ? 'Mettre à jour' : 'Enregistrer'}</Button>
            </div>
          </form>
        </Card>
      )}

      {showDepenseForm && (
        <Card className="mb-8 p-6" style={{ borderTop: '4px solid var(--accent-danger)' }}>
          <h2 className="mb-4">Enregistrer une Dépense</h2>
          <form onSubmit={handleDepenseSubmit}>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="form-group">
                <label className="form-label">Description (Ex: Chasubles) *</label>
                <input type="text" value={depenseData.description} onChange={e=>setDepenseData({...depenseData, description: e.target.value})} className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Montant (DZ) *</label>
                <input type="number" step="0.01" value={depenseData.montant} onChange={e=>setDepenseData({...depenseData, montant: e.target.value})} className="form-input" required />
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="form-group">
                <label className="form-label">Catégorie *</label>
                <select value={depenseData.categorie} onChange={e=>setDepenseData({...depenseData, categorie: e.target.value})} className="form-select" required>
                  <option value="Équipement">Équipement</option>
                  <option value="Salaire">Salaire</option>
                  <option value="Loyer">Loyer</option>
                  <option value="Événement">Événement</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date de la dépense *</label>
                <input type="date" value={depenseData.date_depense} onChange={e=>setDepenseData({...depenseData, date_depense: e.target.value})} className="form-input" required />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-2">
              <Button type="button" variant="secondary" onClick={() => setShowDepenseForm(false)}>Annuler</Button>
              <Button type="submit" style={{ backgroundColor: 'var(--accent-danger)', color: 'white' }}>Enregistrer la dépense</Button>
            </div>
          </form>
        </Card>
      )}

      {/* TABLES TABS */}
      <Card noPadding>
        <div className="flex border-b border-[rgba(255,255,255,0.1)]">
          <button 
            className={`px-6 py-4 font-semibold text-sm transition-colors ${activeTab === 'revenus' ? 'text-success border-b-2 border-success' : 'text-muted hover:text-white'}`}
            style={{ borderBottom: activeTab === 'revenus' ? '2px solid var(--accent-success)' : 'none', color: activeTab === 'revenus' ? 'var(--accent-success)' : 'var(--text-muted)' }}
            onClick={() => setActiveTab('revenus')}
          >
            Historique des Revenus
          </button>
          <button 
            className={`px-6 py-4 font-semibold text-sm transition-colors ${activeTab === 'depenses' ? 'text-danger border-b-2 border-danger' : 'text-muted hover:text-white'}`}
            style={{ borderBottom: activeTab === 'depenses' ? '2px solid var(--accent-danger)' : 'none', color: activeTab === 'depenses' ? 'var(--accent-danger)' : 'var(--text-muted)' }}
            onClick={() => setActiveTab('depenses')}
          >
            Historique des Dépenses
          </button>
        </div>

        <div className="p-4 flex flex-wrap justify-between items-center gap-4 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex flex-wrap gap-3">
            <div className="relative" style={{ width: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" placeholder="Rechercher..." className="form-input" style={{ paddingLeft: '2.25rem' }} value={searchName} onChange={(e) => setSearchName(e.target.value)} />
            </div>
            <select className="form-select w-[130px]" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="all">Tous les mois</option>
              {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select className="form-select w-[100px]" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
              <option value="all">Année</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>
            <Button variant="secondary" onClick={exportToCSV}><Download size={16} /> Export CSV</Button>
          </div>
        </div>
        
        {/* REVENUS TABLE */}
        {activeTab === 'revenus' && (
          cotisLoading ? (
            <div className="p-8 flex flex-col gap-4"><Skeleton height="40px" /><Skeleton height="40px" /></div>
          ) : (
            <div className="table-responsive">
              <table className="w-full text-left border-collapse" style={{ minWidth: '600px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)' }}>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Membre</th>
                    <th className="p-4 font-medium">Montant</th>
                    <th className="p-4 font-medium">Mode</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCotisations.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-muted">Aucun revenu trouvé.</td></tr>
                  ) : filteredCotisations.map(cotis => (
                    <tr key={cotis.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="p-4">{new Date(cotis.date_paiement).toLocaleDateString('fr-FR')}</td>
                      <td className="p-4 font-medium">{cotis.athletes?.nom} {cotis.athletes?.prenom}</td>
                      <td className="p-4 text-success font-semibold">+{cotis.montant_paye} DZ</td>
                      <td className="p-4">{cotis.mode_paiement}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" style={{ padding: '0.4rem 0.75rem' }} onClick={() => handleEditClick(cotis)}><Edit size={16} /></Button>
                          <Button variant="secondary" style={{ padding: '0.4rem 0.75rem' }} onClick={() => generatePDFReceipt(cotis)}><FileText size={16} /> PDF</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* DEPENSES TABLE */}
        {activeTab === 'depenses' && (
          depensesLoading ? (
            <div className="p-8 flex flex-col gap-4"><Skeleton height="40px" /><Skeleton height="40px" /></div>
          ) : (
            <div className="table-responsive">
              <table className="w-full text-left border-collapse" style={{ minWidth: '600px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)' }}>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Description</th>
                    <th className="p-4 font-medium">Catégorie</th>
                    <th className="p-4 font-medium text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepenses.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-muted">Aucune dépense trouvée.</td></tr>
                  ) : filteredDepenses.map(dep => (
                    <tr key={dep.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="p-4">{new Date(dep.date_depense).toLocaleDateString('fr-FR')}</td>
                      <td className="p-4 font-medium">{dep.description}</td>
                      <td className="p-4">
                        <span style={{ padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)', fontSize: '0.8rem' }}>
                          {dep.categorie}
                        </span>
                      </td>
                      <td className="p-4 text-right text-danger font-semibold">-{dep.montant} DZ</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </Card>
    </div>
  );
}
