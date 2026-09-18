import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { TrendingUp, Search, Download, AlertTriangle, FileText, Edit, TrendingDown, DollarSign, Trash2, Eye, Printer, X, Settings, Sliders, Coins, Sparkles, CheckCircle2, Users, MessageCircle, FileOutput } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, PieChart, Pie, Cell } from 'recharts';
import { z } from 'zod';
import { useCotisations } from '../hooks/useCotisations';
import { useDepenses } from '../hooks/useDepenses';
import { useClubPricing } from '../hooks/useClubPricing';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button, Skeleton, Badge } from '../components/ui';
import { formatDA, formatDZ, formatName, formatWhatsAppPhone } from '../utils/formatters';
import { loadClubLogoBase64, generateMonthlyReportPDF } from '../utils/pdfHelpers';
import { detectSiblingGroups } from '../utils/swimmingCategories';
import { useTheme } from '../contexts/ThemeContext';

const paymentSchema = z.object({
  athlete_id: z.string().min(1, 'Veuillez sélectionner un athlète'),
  montant_paye: z.preprocess((val) => Number(val), z.number().positive('Le montant doit être supérieur à 0')),
  mode_paiement: z.enum(['Espèces', 'Virement CCP', 'BaridiMob', 'Chèque']),
  periode_couverte_fin: z.string().min(1, 'Veuillez sélectionner une date de fin'),
});

const depenseSchema = z.object({
  montant: z.preprocess((val) => Number(val), z.number().positive('Le montant doit être supérieur à 0')),
  description: z.string().min(2, 'Description requise'),
  categorie: z.enum(['Location Couloirs', 'Salaires Entraîneurs', 'Achat de Matériel', 'Frais Compétition', 'Autre']),
  date_depense: z.string().min(1, 'Date requise'),
});

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function FinancialDashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { cotisations, loading: cotisLoading, fetchCotisations } = useCotisations();
  const { depenses, loading: depensesLoading, fetchDepenses } = useDepenses();
  const { user } = useAuth();
  const { fraisInscription, cotisationAdhesion, totalAdhesion, updatePricing } = useClubPricing();
  
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('revenus'); // 'revenus' or 'depenses' or 'impayes'
  const [filterRevenueType, setFilterRevenueType] = useState('all'); // 'all', 'inscriptions', 'cotisations'

  // Modale Configuration
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingFormData, setPricingFormData] = useState({ frais_inscription: 300, cotisation_adhesion: 3000 });

  useEffect(() => {
    setPricingFormData({ frais_inscription: fraisInscription, cotisation_adhesion: cotisationAdhesion });
  }, [fraisInscription, cotisationAdhesion]);

  const handleSavePricing = async (e) => {
    e.preventDefault();
    await updatePricing(pricingFormData);
    setShowPricingModal(false);
  };
  
  // Forms
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const initialFormState = { athlete_id: '', montant_paye: '', mode_paiement: 'Espèces', periode_couverte_fin: '' };
  const [formData, setFormData] = useState(initialFormState);
  
  const [showDepenseForm, setShowDepenseForm] = useState(false);
  const [editingDepenseId, setEditingDepenseId] = useState(null);
  const initialDepenseState = { montant: '', description: '', categorie: 'Location Couloirs', date_depense: new Date().toISOString().split('T')[0] };
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
    if (filterRevenueType === 'inscriptions') {
      result = result.filter(c => Number(c.montant_paye) > 3000 || Number(c.montant_paye) === totalAdhesion); // Heuristique simple
    } else if (filterRevenueType === 'cotisations') {
      result = result.filter(c => Number(c.montant_paye) <= 3000);
    }
    return result.sort((a,b) => new Date(b.date_paiement) - new Date(a.date_paiement));
  }, [cotisations, searchName, filterMonth, filterYear, filterRevenueType, totalAdhesion]);
  
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
    return result.sort((a,b) => new Date(b.date_depense) - new Date(a.date_depense));
  }, [depenses, searchName, filterMonth, filterYear]);

  const stats = useMemo(() => {
    // Calcul basé sur les éléments FILTRÉS (ou totaux selon le besoin, ici on veut le total de la période filtrée)
    const totalRev = filteredCotisations.reduce((sum, c) => sum + Number(c.montant_paye), 0);
    const totalDep = filteredDepenses.reduce((sum, d) => sum + Number(d.montant), 0);
    
    // Heuristique : Nouvelle Inscription = Montant > 3000 (ex: 3300)
    const inscriptionsList = filteredCotisations.filter(c => Number(c.montant_paye) > 3000 || Number(c.montant_paye) === totalAdhesion);
    const renouvellementsList = filteredCotisations.filter(c => Number(c.montant_paye) <= 3000);

    const totalFraisInscription = inscriptionsList.reduce((sum, c) => sum + Number(c.montant_paye), 0);
    const totalCotisationsSportives = renouvellementsList.reduce((sum, c) => sum + Number(c.montant_paye), 0);

    // Groupement des dépenses pour le PieChart
    const depMap = {};
    filteredDepenses.forEach(d => {
      const cat = d.categorie || 'Autre';
      if (!depMap[cat]) depMap[cat] = 0;
      depMap[cat] += Number(d.montant);
    });
    const depensesByCategory = Object.keys(depMap).map(k => ({ name: k, value: depMap[k] }));

    return { 
      totalRevenue: totalRev, 
      totalFraisInscription,
      countFraisInscription: inscriptionsList.length,
      totalCotisationsSportives,
      countCotisations: renouvellementsList.length,
      totalDepenses: totalDep,
      beneficeNet: totalRev - totalDep,
      depensesByCategory
    };
  }, [filteredCotisations, filteredDepenses, totalAdhesion]);

  const expiredList = useMemo(() => {
    const now = new Date();
    const lastCotisMap = new Map();
    cotisations.forEach(c => {
      if (c.athlete_id && c.periode_couverte_fin) {
        const existing = lastCotisMap.get(c.athlete_id);
        const curDate = new Date(c.periode_couverte_fin);
        if (!existing || curDate > new Date(existing.periode_couverte_fin)) {
          lastCotisMap.set(c.athlete_id, c);
        }
      }
    });

    const list = [];
    lastCotisMap.forEach((c) => {
      if (new Date(c.periode_couverte_fin) < now) {
        const athlete = athletes.find(a => a.id === c.athlete_id);
        if (athlete) {
          list.push({ 
            ...c, 
            athletes: athlete, 
            endDateStr: new Date(c.periode_couverte_fin).toLocaleDateString('fr-FR') 
          });
        }
      }
    });
    return list.sort((a,b) => new Date(a.periode_couverte_fin) - new Date(b.periode_couverte_fin));
  }, [cotisations, athletes]);

  async function fetchAthletes() {
    try {
      setLoading(true);
      const { data: athletesData } = await supabase.from('athletes').select('id, nom, prenom, telephone, telephone_tuteur, groupes(tarif)').eq('est_actif', true);
      setAthletes(athletesData || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
  useEffect(() => { setCurrentPage(1); }, [activeTab, searchName, filterMonth, filterYear, filterRevenueType]);
  const currentList = activeTab === 'revenus' ? filteredCotisations : (activeTab === 'depenses' ? filteredDepenses : expiredList);
  const totalPages = Math.max(1, Math.ceil(currentList.length / ITEMS_PER_PAGE));
  const paginatedList = useMemo(() => currentList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [currentList, currentPage]);

  const exportToCSV = () => {
    // Basic CSV export logic
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
    const csvContent = BOM + headers.join(";") + "\n" + rows.map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const handleMonthlyReport = async () => {
    const toastId = toast.loading('Génération du rapport de clôture...');
    try {
      await generateMonthlyReportPDF(stats, filterMonth, filterYear);
      toast.success('Rapport PDF généré !', { id: toastId });
    } catch (err) {
      toast.error('Erreur lors de la génération', { id: toastId });
      console.error(err);
    }
  };

  // ----- RECUS PDF GENERATION -----
  const generatePDFReceipt = async (cotisation, autoDownload = false) => {
    const toastId = toast.loading('Préparation du reçu...');
    try {
      let logoBase64 = null;
      try { logoBase64 = await loadClubLogoBase64(); } catch(e){}
      
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const receiptNumber = `SCB-REC-${cotisation.id ? cotisation.id.substring(0, 8).toUpperCase() : Date.now().toString().slice(-6)}`;
      const datePaiementStr = new Date(cotisation.date_paiement).toLocaleDateString('fr-FR');
      const endDateStr = new Date(cotisation.periode_couverte_fin).toLocaleDateString('fr-FR');
      const athleteFullName = `${(cotisation.athletes?.nom || 'NOM').toUpperCase()} ${cotisation.athletes?.prenom || ''}`;
      
      doc.setFillColor(15, 23, 42); doc.rect(0, 0, 210, 5, 'F');
      doc.setFillColor(16, 185, 129); doc.rect(0, 5, 210, 2, 'F');
      if (logoBase64) doc.addImage(logoBase64, 'JPEG', 18, 12, 22, 22);
      
      doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(15, 23, 42);
      doc.text('SPORTING CLUB BOUIRA', 45, 18);
      doc.setFontSize(8.5); doc.setTextColor(16, 185, 129);
      doc.text('REÇU DE PAIEMENT', 45, 23.5);

      doc.setFillColor(248, 250, 252); doc.roundedRect(140, 11, 52, 24, 3, 3, 'F');
      doc.setFontSize(8.5); doc.setTextColor(15, 23, 42);
      doc.text(receiptNumber, 166, 18, { align: 'center' });
      doc.setTextColor(100, 116, 139); doc.text(`Date: ${datePaiementStr}`, 166, 26, { align: 'center' });

      doc.setDrawColor(226, 232, 240); doc.line(18, 40, 192, 40);

      doc.setFontSize(10); doc.setTextColor(15, 23, 42);
      doc.text("ADHÉRENT :", 18, 50);
      doc.setFontSize(14); doc.setTextColor(16, 185, 129);
      doc.text(athleteFullName, 18, 58);

      doc.setFontSize(10); doc.setTextColor(15, 23, 42);
      doc.text("DÉTAILS DU RÈGLEMENT :", 18, 70);
      
      doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.text("Montant payé :", 18, 80); doc.setTextColor(15, 23, 42); doc.text(`${formatDA(cotisation.montant_paye)} DA`, 60, 80);
      doc.setTextColor(100, 116, 139); doc.text("Période couverte :", 18, 88); doc.setTextColor(15, 23, 42); doc.text(`Jusqu'au ${endDateStr}`, 60, 88);
      doc.setTextColor(100, 116, 139); doc.text("Mode de paiement :", 18, 96); doc.setTextColor(15, 23, 42); doc.text(cotisation.mode_paiement || "Espèces", 60, 96);

      doc.setFillColor(255, 255, 255); doc.roundedRect(110, 120, 82, 40, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225); doc.roundedRect(110, 120, 82, 40, 3, 3, 'S');
      doc.setFontSize(8); doc.text("Cachet & Signature SCB :", 116, 127);

      doc.setDrawColor(226, 232, 240); doc.line(18, 275, 192, 275);
      doc.setFontSize(7); doc.setTextColor(148, 163, 184);
      doc.text(`Reçu généré le ${new Date().toLocaleDateString('fr-FR')} - Ne peut être modifié.`, 105, 280, { align: 'center' });

      if (autoDownload) {
        doc.save(`${receiptNumber}.pdf`);
        toast.success('Reçu téléchargé !', { id: toastId });
      } else {
        const pdfBlob = doc.output('blob');
        const pdfUrl = URL.createObjectURL(pdfBlob);
        window.open(pdfUrl, '_blank');
        toast.dismiss(toastId);
      }
    } catch (e) {
      console.error(e);
      toast.error('Erreur PDF', { id: toastId });
    }
  };

  const getPaymentModeBadge = (mode) => {
    switch(mode) {
      case 'BaridiMob': return <Badge style={{ backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#ca8a04', borderColor: 'transparent' }}>🟡 BaridiMob</Badge>;
      case 'Virement CCP': return <Badge style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', borderColor: 'transparent' }}>🔵 CCP</Badge>;
      case 'Chèque': return <Badge style={{ backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#7c3aed', borderColor: 'transparent' }}>🟣 Chèque</Badge>;
      default: return <Badge style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#059669', borderColor: 'transparent' }}>🟢 Espèces</Badge>;
    }
  };

  return (
    <div className="pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1>Gestion Financière</h1>
          <p className="text-muted">Revenus, Dépenses et Clôture Mensuelle</p>
        </div>
        <div className="flex gap-2">
          {/* Phase 5 : Bouton Clôture Mensuelle */}
          <Button variant="secondary" onClick={handleMonthlyReport} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileOutput size={16} /> Clôturer le mois (PDF)
          </Button>
          <Button variant="primary" onClick={() => { setActiveTab('revenus'); setShowPaymentForm(true); setEditingPaymentId(null); setFormData(initialFormState); }}>
            + Encaisser
          </Button>
        </div>
      </div>

      {/* FILTRES GLOBAUX */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
              <input type="text" placeholder="Rechercher (Nom ou Description)..." className="form-input pl-10 w-full" value={searchName} onChange={(e) => setSearchName(e.target.value)} />
            </div>
          </div>
          <select className="form-select w-auto" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
            <option value="all">Tous les mois</option>
            {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select className="form-select w-auto" value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
            <option value="all">Toutes les années</option>
            {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </Card>

      {/* KPI CARDS (Phase 5: Ventilation des revenus) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* REVENUS (VENTILÉS) */}
        <Card className="p-5 flex flex-col justify-between" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-bold text-muted uppercase tracking-wider mb-1">Encaissements Globaux</p>
              <h2 className="text-2xl font-bold" style={{ color: '#10b981' }}>+ {formatDA(stats.totalRevenue)} DA</h2>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><TrendingUp size={24} /></div>
          </div>
          <div className="pt-3 border-t border-[var(--border-color)]">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted">Nouvelles Inscriptions ({stats.countFraisInscription}) :</span>
              <span className="font-semibold">{formatDA(stats.totalFraisInscription)} DA</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted">Renouvellements ({stats.countCotisations}) :</span>
              <span className="font-semibold">{formatDA(stats.totalCotisationsSportives)} DA</span>
            </div>
          </div>
        </Card>

        {/* DÉPENSES */}
        <Card className="p-5 flex flex-col justify-between" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-bold text-muted uppercase tracking-wider mb-1">Décaissements Globaux</p>
              <h2 className="text-2xl font-bold" style={{ color: '#ef4444' }}>- {formatDA(stats.totalDepenses)} DA</h2>
            </div>
            <div className="p-2 bg-red-500/10 text-red-500 rounded-lg"><TrendingDown size={24} /></div>
          </div>
          <div className="pt-3 border-t border-[var(--border-color)]">
            <p className="text-xs text-muted mb-2">Répartition des dépenses :</p>
            {stats.depensesByCategory.length === 0 ? (
              <span className="text-xs italic text-muted">Aucune dépense</span>
            ) : (
              <div className="flex flex-wrap gap-2">
                {stats.depensesByCategory.slice(0, 3).map((cat, i) => (
                  <span key={i} className="text-[10px] bg-slate-500/10 px-2 py-0.5 rounded">{cat.name}</span>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* SOLDE */}
        <Card className="p-5 flex flex-col justify-between" style={{ borderLeft: `4px solid ${stats.beneficeNet >= 0 ? '#3b82f6' : '#f59e0b'}` }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-bold text-muted uppercase tracking-wider mb-1">Solde Net Période</p>
              <h2 className="text-2xl font-bold" style={{ color: stats.beneficeNet >= 0 ? '#3b82f6' : '#f59e0b' }}>
                {stats.beneficeNet > 0 ? '+' : ''} {formatDA(stats.beneficeNet)} DA
              </h2>
            </div>
            <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg"><Coins size={24} /></div>
          </div>
          <div className="pt-3 border-t border-[var(--border-color)]">
            <p className="text-xs text-muted">Bénéfice opérationnel du club sur la période sélectionnée.</p>
          </div>
        </Card>
      </div>

      {/* GRAPHES : Revenus vs Dépenses ET Camembert Dépenses (Phase 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card className="p-5 lg:col-span-2">
          <h3 className="text-base font-bold mb-4">Bilan Annuel</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={useMemo(() => {
              const m = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Aoû','Sep','Oct','Nov','Déc'];
              const r = Array(12).fill(0); const d = Array(12).fill(0);
              cotisations.filter(c => new Date(c.date_paiement).getFullYear() === parseInt(filterYear)).forEach(c => r[new Date(c.date_paiement).getMonth()] += Number(c.montant_paye));
              depenses.filter(x => new Date(x.date_depense).getFullYear() === parseInt(filterYear)).forEach(x => d[new Date(x.date_depense).getMonth()] += Number(x.montant));
              return m.map((name, i) => ({ name, Revenus: r[i], Dépenses: d[i] }));
            }, [cotisations, depenses, filterYear])}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'var(--bg-tertiary)' }} contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px' }} />
              <Legend iconType="circle" />
              <Bar dataKey="Revenus" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} />
              <Bar dataKey="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Phase 5 : PieChart Dépenses */}
        <Card className="p-5 flex flex-col">
          <h3 className="text-base font-bold mb-2">Répartition des Dépenses</h3>
          <p className="text-xs text-muted mb-4">Catégorisation sur la période filtrée</p>
          <div className="flex-1 flex items-center justify-center">
            {stats.depensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={stats.depensesByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                    {stats.depensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: 'none', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted">Aucune dépense.</div>
            )}
          </div>
          {/* Légende custom */}
          <div className="flex flex-wrap gap-2 mt-4">
            {stats.depensesByCategory.map((entry, index) => (
              <div key={`leg-${index}`} className="flex items-center gap-1.5 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></div>
                <span className="text-muted">{entry.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* GESTION DES LISTES */}
      <Card className="p-0 overflow-hidden">
        <div className="flex border-b border-[var(--border-color)]">
          <button className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'revenus' ? 'border-[#10b981] text-[#10b981]' : 'border-transparent text-muted hover:bg-[var(--bg-tertiary)]'}`} onClick={() => setActiveTab('revenus')}>
            Encaissements ({filteredCotisations.length})
          </button>
          <button className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'depenses' ? 'border-[#ef4444] text-[#ef4444]' : 'border-transparent text-muted hover:bg-[var(--bg-tertiary)]'}`} onClick={() => setActiveTab('depenses')}>
            Dépenses ({filteredDepenses.length})
          </button>
          <button className={`flex-1 py-4 text-sm font-bold text-center border-b-2 transition-colors ${activeTab === 'impayes' ? 'border-[#f59e0b] text-[#f59e0b]' : 'border-transparent text-muted hover:bg-[var(--bg-tertiary)]'}`} onClick={() => setActiveTab('impayes')}>
            Impayés / Retards ({expiredList.length})
          </button>
        </div>

        <div className="p-5">
          {activeTab === 'revenus' && (
            <div className="table-responsive">
              <table style={{ minWidth: '850px' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Adhérent</th>
                    <th>Montant</th>
                    <th>Mode (Tags)</th>
                    <th>Période Couverte</th>
                    <th style={{ textAlign: 'right' }}>Actions (PDF / WA)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.length === 0 ? (
                    <tr><td colSpan="6" className="text-center py-6 text-muted">Aucun encaissement trouvé.</td></tr>
                  ) : (
                    paginatedList.map(cotis => {
                      const athleteName = cotis.athletes ? `${cotis.athletes.nom} ${cotis.athletes.prenom}` : 'Inconnu';
                      const wpPhone = cotis.athletes ? formatWhatsAppPhone(cotis.athletes.telephone || cotis.athletes.telephone_tuteur) : null;
                      return (
                        <tr key={cotis.id}>
                          <td className="text-xs text-muted">{new Date(cotis.date_paiement).toLocaleDateString('fr-FR')}</td>
                          <td className="font-semibold text-sm">{athleteName}</td>
                          <td className="font-bold text-emerald-500">{formatDA(cotis.montant_paye)} DA</td>
                          <td>{getPaymentModeBadge(cotis.mode_paiement)}</td>
                          <td className="text-xs">Jusqu'au {new Date(cotis.periode_couverte_fin).toLocaleDateString('fr-FR')}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="flex justify-end items-center gap-1.5">
                              <button onClick={() => generatePDFReceipt(cotis, true)} className="btn-secondary flex items-center justify-center p-1.5 rounded text-indigo-500 hover:bg-indigo-500/10" title="Télécharger Reçu PDF">
                                <Download size={14} />
                              </button>
                              {wpPhone && (
                                <a href={`https://wa.me/${wpPhone}?text=${encodeURIComponent(`Bonjour ${cotis.athletes?.prenom}, voici la confirmation de votre paiement de ${formatDA(cotis.montant_paye)} DA pour la cotisation SC Bouira (valable jusqu'au ${new Date(cotis.periode_couverte_fin).toLocaleDateString('fr-FR')}). Merci !`)}`} target="_blank" rel="noreferrer" className="btn-secondary flex items-center justify-center p-1.5 rounded text-[#25D366] hover:bg-[#25D366]/10" title="Envoyer Reçu WhatsApp">
                                  <MessageCircle size={14} />
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'depenses' && (
            <div className="table-responsive">
              <table style={{ minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Catégorie</th>
                    <th>Description</th>
                    <th>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-6 text-muted">Aucune dépense trouvée.</td></tr>
                  ) : (
                    paginatedList.map(dep => (
                      <tr key={dep.id}>
                        <td className="text-xs text-muted">{new Date(dep.date_depense).toLocaleDateString('fr-FR')}</td>
                        <td><Badge style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>{dep.categorie}</Badge></td>
                        <td className="text-sm">{dep.description}</td>
                        <td className="font-bold text-red-500">- {formatDA(dep.montant)} DA</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Phase 5 : Onglet Impayés avec WhatsApp Pré-rempli */}
          {activeTab === 'impayes' && (
            <div className="table-responsive">
              <table style={{ minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th>Adhérent</th>
                    <th>Groupe (Tarif)</th>
                    <th>Date d'expiration</th>
                    <th>Retard</th>
                    <th style={{ textAlign: 'right' }}>Relance Rapide</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedList.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-6 text-emerald-500 font-bold"><CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" /> Aucun impayé !</td></tr>
                  ) : (
                    paginatedList.map(cotis => {
                      const athleteName = cotis.athletes ? `${cotis.athletes.nom} ${cotis.athletes.prenom}` : 'Inconnu';
                      const wpPhone = cotis.athletes ? formatWhatsAppPhone(cotis.athletes.telephone || cotis.athletes.telephone_tuteur) : null;
                      const tarif = cotis.athletes?.groupes?.tarif || 3000;
                      
                      const retardDays = Math.max(0, Math.floor((new Date() - new Date(cotis.periode_couverte_fin)) / (1000 * 60 * 60 * 24)));
                      
                      return (
                        <tr key={`imp-${cotis.id}`} style={{ backgroundColor: isDark ? 'rgba(245, 158, 11, 0.05)' : 'rgba(245, 158, 11, 0.03)' }}>
                          <td className="font-semibold text-sm">{athleteName}</td>
                          <td className="text-xs text-muted">{cotis.athletes?.groupes?.nom || '-'} <br/><span className="text-[10px] text-red-400">Dû : {formatDA(tarif)} DA</span></td>
                          <td className="text-xs font-bold text-orange-500">{cotis.endDateStr}</td>
                          <td className="text-xs font-bold text-red-500">{retardDays} jour(s)</td>
                          <td style={{ textAlign: 'right' }}>
                            {wpPhone ? (
                              <a href={`https://wa.me/${wpPhone}?text=${encodeURIComponent(`Bonjour ${cotis.athletes?.prenom}, sauf erreur de notre part, votre cotisation SC Bouira de ${formatDA(tarif)} DA a expiré le ${cotis.endDateStr}. Merci de régulariser la situation à la réception. Sportivement.`)}`} target="_blank" rel="noreferrer">
                                <Button variant="secondary" style={{ backgroundColor: 'rgba(37, 211, 102, 0.1)', color: '#25D366', borderColor: 'transparent', padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>
                                  <MessageCircle size={14} style={{ marginRight: '6px' }} /> Relancer
                                </Button>
                              </a>
                            ) : (
                              <span className="text-[10px] text-muted italic">Pas de numéro</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-[var(--border-color)]">
              <span className="text-xs text-muted">Page {currentPage} sur {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '0.4rem 0.8rem' }}>Précédent</Button>
                <Button variant="secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '0.4rem 0.8rem' }}>Suivant</Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
