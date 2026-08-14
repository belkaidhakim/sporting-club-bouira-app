import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { TrendingUp, Search, Download, AlertTriangle, FileText, Edit, TrendingDown, DollarSign, Trash2 } from 'lucide-react';
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

const formatDZ = (val) => {
  if (val === undefined || val === null || val === '') return '0 DZ';
  const num = Number(val);
  if (isNaN(num)) return '0 DZ';
  return `${num.toLocaleString('fr-FR')} DZ`;
};

const formatName = (nom = '', prenom = '') => {
  const formattedNom = (nom || '').trim().toUpperCase();
  const formattedPrenom = (prenom || '').trim()
    .toLowerCase()
    .replace(/(?:^|\s|-)\S/g, (char) => char.toUpperCase());
  return `${formattedNom} ${formattedPrenom}`.trim() || 'Non renseigné';
};

export default function FinancialDashboard() {
  const { cotisations, loading: cotisLoading, fetchCotisations } = useCotisations();
  const { depenses, loading: depensesLoading, fetchDepenses } = useDepenses();
  const { user } = useAuth();
  
  const [athletes, setAthletes] = useState([]);
  const [, setLoading] = useState(true);
  
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
  const [editingDepenseId, setEditingDepenseId] = useState(null);
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

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchName, filterMonth, filterYear]);

  const currentList = activeTab === 'revenus' ? filteredCotisations : filteredDepenses;
  const totalPages = Math.max(1, Math.ceil(currentList.length / ITEMS_PER_PAGE));

  const paginatedCotisations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCotisations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCotisations, currentPage]);

  const paginatedDepenses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredDepenses.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDepenses, currentPage]);

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

  const expiredCount = useMemo(() => {
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

    let count = 0;
    lastCotisMap.forEach((c) => {
      if (new Date(c.periode_couverte_fin) < now) {
        count++;
      }
    });
    return count;
  }, [cotisations]);

  const currentMonthName = useMemo(() => {
    const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
    return months[new Date().getMonth()];
  }, []);

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

  const handleDeleteCotisation = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce paiement de cotisation ?")) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('cotisations').delete().eq('id', id);
      if (error) throw error;
      toast.success("Paiement supprimé avec succès");
      fetchCotisations();
    } catch (err) {
      toast.error("Erreur lors de la suppression : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers for Dépenses ---
  const handleEditDepense = (dep) => {
    setDepenseData({
      montant: dep.montant,
      description: dep.description,
      categorie: dep.categorie || 'Équipement',
      date_depense: dep.date_depense ? new Date(dep.date_depense).toISOString().split('T')[0] : ''
    });
    setEditingDepenseId(dep.id);
    setActiveTab('depenses');
    setShowDepenseForm(true);
    setShowPaymentForm(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDepenseSubmit = async (e) => {
    e.preventDefault();
    try {
      depenseSchema.parse(depenseData);
    } catch (err) {
      if (err instanceof z.ZodError) { toast.error(err.errors[0].message); return; }
    }
    try {
      setLoading(true);
      if (editingDepenseId) {
        const { error } = await supabase
          .from('depenses')
          .update(depenseData)
          .eq('id', editingDepenseId);
        if (error) throw error;
        toast.success('Dépense modifiée avec succès !');
      } else {
        const { error } = await supabase.from('depenses').insert([{
          ...depenseData,
          created_by: user?.id
        }]);
        if (error) throw error;
        toast.success('Dépense enregistrée !');
      }
      setShowDepenseForm(false);
      setEditingDepenseId(null);
      setDepenseData(initialDepenseState);
      fetchDepenses();
    } catch (error) {
      toast.error('Erreur : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDepense = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette dépense ?")) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('depenses').delete().eq('id', id);
      if (error) throw error;
      toast.success("Dépense supprimée avec succès");
      fetchDepenses();
    } catch (err) {
      toast.error("Erreur lors de la suppression : " + err.message);
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
    } catch {
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

  const loadLogoBase64 = () => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = '/logo.jpg';
    });
  };

  const generatePDFReceipt = async (cotisation) => {
    try {
      const toastId = toast.loading('Génération du reçu officiel en cours...');
      const logoBase64 = await loadLogoBase64();
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const receiptNumber = `SCB-REC-${cotisation.id ? cotisation.id.substring(0, 8).toUpperCase() : Date.now().toString().slice(-6)}`;
      const datePaiement = new Date(cotisation.date_paiement);
      const datePaiementStr = isNaN(datePaiement.getTime()) ? '-' : datePaiement.toLocaleDateString('fr-FR');
      const endDate = new Date(cotisation.periode_couverte_fin);
      const endDateStr = isNaN(endDate.getTime()) ? '-' : endDate.toLocaleDateString('fr-FR');
      
      const athleteNom = cotisation.athletes?.nom?.toUpperCase() || 'NOM';
      const athletePrenom = cotisation.athletes?.prenom || 'Prénom';
      const athleteFullName = `${athleteNom} ${athletePrenom}`;
      const athleteGroupe = cotisation.athletes?.groupes?.nom || cotisation.athletes?.groupe || 'Non assigné';
      const athletePhone = cotisation.athletes?.telephone || 'Non renseigné';
      const athleteBirth = cotisation.athletes?.date_naissance ? new Date(cotisation.athletes.date_naissance).toLocaleDateString('fr-FR') : 'Non renseignée';
      const athleteToken = cotisation.athletes?.token_qr ? cotisation.athletes.token_qr.substring(0, 14) : `SCB-${cotisation.athlete_id ? cotisation.athlete_id.substring(0, 8).toUpperCase() : 'MEMBRE'}`;

      // 1. BANDEAU COULEURS SUPÉRIEUR
      doc.setFillColor(15, 23, 42); // Navy
      doc.rect(0, 0, 210, 5, 'F');
      doc.setFillColor(245, 158, 11); // Gold accent
      doc.rect(0, 5, 210, 1.5, 'F');

      // 2. EN-TÊTE DU CLUB & LOGO
      let headerTextX = 18;
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'JPEG', 18, 12, 24, 24);
          headerTextX = 46;
        } catch (e) {
          console.warn('Erreur insertion logo dans le PDF:', e);
        }
      }

      // Nom & sous-titre du club
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text('SPORTING CLUB BOUIRA', headerTextX, 19);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(79, 70, 229);
      doc.text('ASSOCIATION SPORTIVE & D\'ATHLÉTISME DE BOUIRA', headerTextX, 24);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Siège Social : Complexe Sportif, Bouira (10000) · Algérie', headerTextX, 29);
      doc.text('Tél : +213 (0) 550 00 00 00 · Email : contact@sportingclub-bouira.com', headerTextX, 33);

      // Boîte Badge Numéro de reçu (en haut à droite)
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(138, 11, 54, 24, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.roundedRect(138, 11, 54, 24, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('REÇU DE PAIEMENT', 165, 17, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(79, 70, 229);
      doc.text(receiptNumber, 165, 23, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Date : ${datePaiementStr}`, 165, 29, { align: 'center' });

      // Ligne de séparation
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(18, 40, 192, 40);

      // 3. SECTION 1 : INFORMATIONS DE L'ATHLÈTE / MEMBRE
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(18, 45, 174, 38, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(18, 45, 174, 38, 3, 3, 'S');

      // Bandeau titre section
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(18, 45, 174, 8, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(79, 70, 229);
      doc.text("INFORMATIONS DU MEMBRE ADHÉRENT", 24, 50.5);

      // Colonne Gauche
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("NOM & PRÉNOM :", 24, 60);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(athleteFullName, 24, 67);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("GROUPE / SECTION :", 24, 75);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(athleteGroupe, 58, 75);

      // Colonne Droite
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("TÉLÉPHONE :", 115, 60);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(athletePhone, 142, 60);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("NÉ(E) LE :", 115, 68);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(athleteBirth, 142, 68);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("ID BADGE :", 115, 75);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(79, 70, 229);
      doc.text(athleteToken, 142, 75);

      // 4. SECTION 2 : DÉTAILS DU PAIEMENT & PRESTATION
      // En-tête tableau
      doc.setFillColor(15, 23, 42);
      doc.roundedRect(18, 90, 174, 9, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text("DÉSIGNATION DE LA PRESTATION", 24, 96);
      doc.text("MODE RÈGLEMENT", 95, 96);
      doc.text("PÉRIODE COUVERTE", 132, 96);
      doc.text("MONTANT", 186, 96, { align: 'right' });

      // Ligne du tableau
      doc.setFillColor(255, 255, 255);
      doc.rect(18, 99, 174, 25, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.rect(18, 99, 174, 25, 'S');

      // Libellé prestation
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("Cotisation membre & droit d'accès club", 24, 109);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Accès régulier aux séances d'entraînement et installations", 24, 115);

      // Mode règlement
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(cotisation.mode_paiement || "Espèces", 95, 111);

      // Période couverte
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Jusqu'au ${endDateStr}`, 132, 111);

      // Montant
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(16, 185, 129);
      doc.text(formatDZ(cotisation.montant_paye), 186, 111, { align: 'right' });

      // Bloc Total & Validation verte
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(18, 130, 174, 22, 3, 3, 'F');
      doc.setDrawColor(134, 239, 172);
      doc.setLineWidth(0.5);
      doc.roundedRect(18, 130, 174, 22, 3, 3, 'S');

      // Pastille verte
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(24, 135, 46, 12, 6, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(21, 128, 61);
      doc.text("✔ RÉGLÉ / ENCAISSÉ", 47, 142.5, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Paiement intégral validé par l'administration du club.", 76, 142.5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL ENCAISSÉ :", 140, 139);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(21, 128, 61);
      doc.text(formatDZ(cotisation.montant_paye), 186, 146, { align: 'right' });

      // 5. SECTION 3 : CONDITIONS & MENTIONS LÉGALES
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(18, 159, 174, 22, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.4);
      doc.roundedRect(18, 159, 174, 22, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(79, 70, 229);
      doc.text("CONDITIONS D'ACCÈS & RÈGLEMENT INTÉRIEUR", 24, 165);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text("• Le présent reçu certifie le paiement effectif de la cotisation pour la durée définie.", 24, 170);
      doc.text("• La présentation de la carte d'adhérent avec son QR Code est obligatoire lors de chaque séance d'entraînement.", 24, 174);
      doc.text("• Ce document doit être conservé par le membre ou son représentant légal.", 24, 178);

      // 6. SECTION 4 : SIGNATURES & CACHET OFFICIEL
      // Cadre gauche - Adhérent
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(18, 188, 82, 48, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.roundedRect(18, 188, 82, 48, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("Signature de l'adhérent ou tuteur légal :", 24, 195);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      doc.text("(Faire précéder de la mention manuscrite 'Lu et approuvé')", 24, 199);

      // Cadre droite - Administration
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(110, 188, 82, 48, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(110, 188, 82, 48, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("Cachet & Signature de l'Administration :", 116, 195);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(79, 70, 229);
      doc.text("SPORTING CLUB BOUIRA", 116, 200);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      doc.text("Secrétariat Général / Trésorerie", 116, 204);

      // 7. PIED DE PAGE OFFICIEL
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(18, 270, 192, 270);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Sporting Club Bouira · Document officiel informatisé généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 105, 275, { align: 'center' });
      doc.text("Ce reçu ne peut être ni raturé ni modifié sans autorisation préalable de la direction.", 105, 279, { align: 'center' });

      // Bandeau inférieur
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 292, 210, 5, 'F');

      // Sauvegarde du fichier PDF
      const sanitizedName = (cotisation.athletes?.nom || 'Adherent').replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateFile = datePaiementStr.replace(/\//g, '-');
      doc.save(`Recu_Paiement_${sanitizedName}_${dateFile}.pdf`);

      toast.dismiss(toastId);
      toast.success('Reçu PDF généré et téléchargé avec succès !');
    } catch (err) {
      console.error('Erreur génération PDF:', err);
      toast.error('Erreur lors de la génération du reçu PDF : ' + err.message);
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1>Tableau de bord financier</h1>
          <p>Suivez vos revenus, vos dépenses et calculez vos bénéfices.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={checkExpirations} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={18} className="text-warning" /> Expirations
            {expiredCount > 0 && (
              <span 
                style={{ 
                  backgroundColor: '#ef4444', 
                  color: 'white', 
                  borderRadius: '9999px', 
                  padding: '2px 7px', 
                  fontSize: '0.75rem', 
                  fontWeight: 700,
                  lineHeight: 1,
                  boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)'
                }}
                title={`${expiredCount} cotisation(s) expirée(s)`}
              >
                {expiredCount}
              </span>
            )}
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
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-semibold text-muted mb-0">Total Revenus</h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Historique Global</span>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Outfit', color: 'var(--accent-success)' }}>
            + {formatDZ(stats.totalRevenue)}
          </div>
          <div className="text-xs text-muted" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px border-dashed rgba(255,255,255,0.05)', paddingTop: '4px' }}>
            <span>Ce mois ({currentMonthName}) :</span>
            <span style={{ fontWeight: 600, color: 'var(--accent-success)' }}>+{formatDZ(stats.totalThisMonth)}</span>
          </div>
        </Card>

        <Card className="flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-semibold text-muted mb-0">Total Dépenses</h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Historique Global</span>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-danger)' }}>
              <TrendingDown size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Outfit', color: 'var(--accent-danger)' }}>
            - {formatDZ(stats.totalDepenses)}
          </div>
          <div className="text-xs text-muted" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px border-dashed rgba(255,255,255,0.05)', paddingTop: '4px' }}>
            <span>Ce mois ({currentMonthName}) :</span>
            <span style={{ fontWeight: 600, color: 'var(--accent-danger)' }}>-{formatDZ(stats.depensesThisMonth)}</span>
          </div>
        </Card>
        
        <Card className="flex-col gap-4" style={{ border: '2px solid rgba(56, 189, 248, 0.2)' }}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-semibold text-muted mb-0">Bénéfice Net</h3>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cumul Global</span>
            </div>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
              <DollarSign size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'Outfit', color: stats.beneficeNet >= 0 ? 'white' : 'var(--accent-danger)' }}>
            {stats.beneficeNet > 0 ? '+' : ''}{formatDZ(stats.beneficeNet)}
          </div>
          <div className="text-xs text-muted" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px border-dashed rgba(255,255,255,0.05)', paddingTop: '4px' }}>
            <span>Ce mois ({currentMonthName}) :</span>
            <span style={{ fontWeight: 600, color: stats.beneficeThisMonth >= 0 ? '#38bdf8' : 'var(--accent-danger)' }}>
              {stats.beneficeThisMonth > 0 ? '+' : ''}{formatDZ(stats.beneficeThisMonth)}
            </span>
          </div>
        </Card>
      </div>

      {/* CHART */}
      <Card className="mb-8 p-4">
        <h3 className="text-sm font-semibold text-muted mb-4">Évolution Financière ({new Date().getFullYear()})</h3>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 35, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis 
                stroke="var(--text-muted)" 
                fontSize={11} 
                tickLine={false} 
                axisLine={false}
                width={75}
                tickFormatter={(val) => val >= 1000 ? `${(val / 1000).toLocaleString('fr-FR')}k DZ` : `${val} DZ`}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.06)' }}
                contentStyle={{ 
                  backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                  backdropFilter: 'blur(8px)',
                  border: '1px solid var(--border-color)', 
                  borderRadius: '10px',
                  padding: '10px 14px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
                labelStyle={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', fontSize: '0.85rem' }}
                itemStyle={{ fontSize: '0.85rem', fontWeight: 600, padding: '2px 0' }}
                formatter={(value, name) => [
                  `${name === 'Dépenses' ? '-' : '+'}${Number(value).toLocaleString('fr-FR')} DZ`,
                  name
                ]}
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
                  {athletes.map(a => <option key={a.id} value={a.id}>{formatName(a.nom, a.prenom)}</option>)}
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
          <h2 className="mb-4">{editingDepenseId ? 'Modifier une Dépense' : 'Enregistrer une Dépense'}</h2>
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
              <Button type="button" variant="secondary" onClick={() => { setShowDepenseForm(false); setEditingDepenseId(null); }}>Annuler</Button>
              <Button type="submit" style={{ backgroundColor: 'var(--accent-danger)', color: 'white' }}>
                {editingDepenseId ? 'Mettre à jour la dépense' : 'Enregistrer la dépense'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TABLES TABS */}
      <Card noPadding>
        <div 
          className="flex flex-wrap gap-2 p-3" 
          style={{ 
            backgroundColor: 'var(--bg-tertiary)', 
            borderBottom: '1px solid var(--border-color)',
            borderTopLeftRadius: 'var(--radius-lg)',
            borderTopRightRadius: 'var(--radius-lg)'
          }}
        >
          <button 
            className="flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all"
            style={{ 
              backgroundColor: activeTab === 'revenus' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              border: activeTab === 'revenus' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
              color: activeTab === 'revenus' ? 'var(--accent-success)' : 'var(--text-muted)',
              boxShadow: activeTab === 'revenus' ? '0 0 12px rgba(16, 185, 129, 0.2)' : 'none',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('revenus')}
          >
            <TrendingUp size={16} />
            Historique des Revenus
            <span 
              style={{ 
                marginLeft: '6px', 
                padding: '2px 8px', 
                borderRadius: '9999px', 
                backgroundColor: activeTab === 'revenus' ? 'var(--accent-success)' : 'rgba(255,255,255,0.1)',
                color: activeTab === 'revenus' ? '#fff' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {filteredCotisations.length}
            </span>
          </button>

          <button 
            className="flex items-center gap-2 px-5 py-3 rounded-lg font-semibold text-sm transition-all"
            style={{ 
              backgroundColor: activeTab === 'depenses' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
              border: activeTab === 'depenses' ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid transparent',
              color: activeTab === 'depenses' ? 'var(--accent-danger)' : 'var(--text-muted)',
              boxShadow: activeTab === 'depenses' ? '0 0 12px rgba(239, 68, 68, 0.2)' : 'none',
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('depenses')}
          >
            <TrendingDown size={16} />
            Historique des Dépenses
            <span 
              style={{ 
                marginLeft: '6px', 
                padding: '2px 8px', 
                borderRadius: '9999px', 
                backgroundColor: activeTab === 'depenses' ? 'var(--accent-danger)' : 'rgba(255,255,255,0.1)',
                color: activeTab === 'depenses' ? '#fff' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 700
              }}
            >
              {filteredDepenses.length}
            </span>
          </button>
        </div>

        <div className="p-4 flex flex-wrap justify-between items-center gap-4 border-b border-[rgba(255,255,255,0.05)]">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative" style={{ minWidth: '220px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Rechercher par nom / motif..." 
                className="form-input" 
                style={{ 
                  paddingLeft: '2.5rem', 
                  backgroundColor: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)' 
                }} 
                value={searchName} 
                onChange={(e) => setSearchName(e.target.value)} 
              />
            </div>
            
            <div className="relative" style={{ minWidth: '150px' }}>
              <select 
                className="form-select" 
                style={{ 
                  width: '100%',
                  backgroundColor: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  padding: '0.5rem 1rem',
                  cursor: 'pointer'
                }} 
                value={filterMonth} 
                onChange={(e) => setFilterMonth(e.target.value)}
              >
                <option value="all">📅 Tous les mois</option>
                {['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'].map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>

            <div className="relative" style={{ minWidth: '130px' }}>
              <select 
                className="form-select" 
                style={{ 
                  width: '100%',
                  backgroundColor: 'var(--bg-tertiary)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  padding: '0.5rem 1rem',
                  cursor: 'pointer'
                }} 
                value={filterYear} 
                onChange={(e) => setFilterYear(e.target.value)}
              >
                <option value="all">📆 Toutes années</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
          </div>

          <Button 
            variant="secondary" 
            onClick={exportToCSV}
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '6px',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              color: 'var(--accent-primary-hover)',
              fontWeight: 600,
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              transition: 'all 0.2s ease'
            }}
            title="Télécharger l'historique au format CSV"
          >
            <Download size={16} /> Exporter CSV
          </Button>
        </div>
        
        {/* REVENUS TABLE */}
        {activeTab === 'revenus' && (
          cotisLoading ? (
            <div className="p-8 flex flex-col gap-4"><Skeleton height="40px" /><Skeleton height="40px" /></div>
          ) : (
            <div className="table-responsive">
              <table className="w-full text-left border-collapse" style={{ minWidth: '650px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Membre</th>
                    <th className="p-4 font-medium">Motif / Type</th>
                    <th className="p-4 font-medium">Montant</th>
                    <th className="p-4 font-medium">Mode</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCotisations.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-muted">Aucun revenu trouvé.</td></tr>
                  ) : paginatedCotisations.map(cotis => (
                    <tr key={cotis.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="p-4">{new Date(cotis.date_paiement).toLocaleDateString('fr-FR')}</td>
                      <td className="p-4 font-medium">{formatName(cotis.athletes?.nom, cotis.athletes?.prenom)}</td>
                      <td className="p-4">
                        <span style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-success)', fontSize: '0.75rem', fontWeight: 600 }}>
                          Cotisation
                        </span>
                      </td>
                      <td className="p-4 text-success font-semibold">+{formatDZ(cotis.montant_paye)}</td>
                      <td className="p-4">{cotis.mode_paiement}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" style={{ padding: '0.4rem 0.75rem' }} onClick={() => handleEditClick(cotis)} title="Modifier ce paiement"><Edit size={16} /></Button>
                          <Button variant="secondary" style={{ padding: '0.4rem 0.75rem' }} onClick={() => generatePDFReceipt(cotis)} title="Télécharger le reçu PDF"><FileText size={16} /> PDF</Button>
                          <Button variant="secondary" style={{ padding: '0.4rem 0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteCotisation(cotis.id)} title="Supprimer ce paiement"><Trash2 size={16} /></Button>
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
              <table className="w-full text-left border-collapse" style={{ minWidth: '650px' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Motif / Description</th>
                    <th className="p-4 font-medium">Catégorie</th>
                    <th className="p-4 font-medium text-right">Montant</th>
                    <th className="p-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDepenses.length === 0 ? (
                    <tr><td colSpan="5" className="p-8 text-center text-muted">Aucune dépense trouvée.</td></tr>
                  ) : paginatedDepenses.map(dep => (
                    <tr key={dep.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td className="p-4">{new Date(dep.date_depense).toLocaleDateString('fr-FR')}</td>
                      <td className="p-4 font-medium">{dep.description}</td>
                      <td className="p-4">
                        <span style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: 'rgba(239, 68, 68, 0.12)', color: 'var(--accent-danger)', fontSize: '0.75rem', fontWeight: 600 }}>
                          {dep.categorie}
                        </span>
                      </td>
                      <td className="p-4 text-right text-danger font-semibold">-{formatDZ(dep.montant)}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" style={{ padding: '0.4rem 0.75rem' }} onClick={() => handleEditDepense(dep)} title="Modifier cette dépense"><Edit size={16} /></Button>
                          <Button variant="secondary" style={{ padding: '0.4rem 0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }} onClick={() => handleDeleteDepense(dep.id)} title="Supprimer cette dépense"><Trash2 size={16} /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* PAGINATION FOOTER */}
        {currentList.length > 0 && (
          <div className="p-4 flex flex-wrap justify-between items-center border-t border-[rgba(255,255,255,0.05)] text-sm gap-2">
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>
              Affichage de {(currentPage - 1) * ITEMS_PER_PAGE + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, currentList.length)} sur {currentList.length} transaction(s)
            </span>
            {totalPages > 1 && (
              <div className="flex gap-2 items-center">
                <Button 
                  variant="secondary" 
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  ← Précédent
                </Button>
                <span style={{ fontSize: '0.8rem', padding: '0 8px', color: 'var(--text-muted)' }}>
                  Page {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="secondary" 
                  style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }}
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  Suivant →
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
