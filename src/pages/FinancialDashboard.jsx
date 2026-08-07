import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { CreditCard, TrendingUp, Search, Download, AlertTriangle, FileText, Edit } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useCotisations } from '../hooks/useCotisations';
import { Card, Button, Skeleton } from '../components/ui';

export default function FinancialDashboard() {
  const { cotisations, loading: cotisLoading, fetchCotisations } = useCotisations();
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  
  const initialFormState = {
    athlete_id: '',
    montant_paye: '',
    mode_paiement: 'Virement',
    periode_couverte_fin: ''
  };
  const [formData, setFormData] = useState(initialFormState);
  
  // Filters
  const [searchName, setSearchName] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchCotisations();
    fetchAthletes();
  }, [fetchCotisations]);

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

  const stats = useMemo(() => {
    const total = cotisations.reduce((sum, c) => sum + Number(c.montant_paye), 0);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonth = cotisations
      .filter(c => {
        const date = new Date(c.date_paiement);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, c) => sum + Number(c.montant_paye), 0);
    return { totalRevenue: total, totalThisMonth: thisMonth };
  }, [cotisations]);

  const chartData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentYearData = cotisations.filter(c => new Date(c.date_paiement).getFullYear() === currentYear);
    const monthlyRevenues = Array(12).fill(0);
    currentYearData.forEach(c => {
      const m = new Date(c.date_paiement).getMonth();
      monthlyRevenues[m] += Number(c.montant_paye);
    });
    return months.map((month, index) => ({ name: month, revenus: monthlyRevenues[index] }));
  }, [cotisations]);

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      let error;
      if (editingPaymentId) {
        const { error: updateError } = await supabase
          .from('cotisations')
          .update(formData)
          .eq('id', editingPaymentId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('cotisations')
          .insert([formData]);
        error = insertError;
      }

      if (error) throw error;
      
      toast.success(editingPaymentId ? 'Paiement modifié avec succès !' : 'Paiement enregistré avec succès !');
      setShowPaymentForm(false);
      setEditingPaymentId(null);
      setFormData(initialFormState);
      fetchCotisations();
    } catch (error) {
      console.error('Error recording payment:', error.message);
      toast.error('Erreur lors de l\'enregistrement : ' + error.message);
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
    setShowPaymentForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const checkExpirations = async () => {
    setLoading(true);
    try {
      const { data: cards, error: cardsError } = await supabase
        .from('cartes_acces')
        .select('athlete_id, statut')
        .eq('statut', 'ACTIVE');
      
      if (cardsError) throw cardsError;

      let expiredCount = 0;
      const now = new Date();

      for (const card of cards) {
        const { data: cotis } = await supabase
          .from('cotisations')
          .select('periode_couverte_fin')
          .eq('athlete_id', card.athlete_id)
          .order('periode_couverte_fin', { ascending: false })
          .limit(1);

        if (cotis && cotis.length > 0) {
          const endDate = new Date(cotis[0].periode_couverte_fin);
          if (endDate < now) {
            await supabase
              .from('cartes_acces')
              .update({ statut: 'EXPIREE' })
              .eq('athlete_id', card.athlete_id);
            expiredCount++;
          }
        }
      }

      if (expiredCount > 0) {
        toast.success(`${expiredCount} cartes d'accès ont été marquées comme expirées.`);
      } else {
        toast.success("Aucune nouvelle carte n'est arrivée à expiration.");
      }
    } catch (error) {
      console.error('Error checking expirations:', error.message);
      toast.error("Erreur lors de la vérification des expirations.");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Membre', 'Montant (DZ)', 'Mode de paiement', 'Date de fin couverte'];
    const rows = filteredCotisations.map(c => [
      new Date(c.date_paiement).toLocaleDateString('fr-FR'),
      `${c.athletes?.nom} ${c.athletes?.prenom}`,
      c.montant_paye,
      c.mode_paiement,
      new Date(c.periode_couverte_fin).toLocaleDateString('fr-FR')
    ]);
    
    // Add BOM for Excel UTF-8 encoding
    const BOM = "\uFEFF";
    let csvContent = BOM + headers.join(";") + "\n" 
      + rows.map(e => e.join(";")).join("\n");
      
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `export_cotisations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generatePDFReceipt = (cotisation) => {
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246);
    doc.text("CLUB SPORTS", 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Reçu de paiement de cotisation", 20, 28);
    
    doc.line(20, 35, 190, 35);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    
    doc.text(`Date : ${new Date(cotisation.date_paiement).toLocaleDateString('fr-FR')}`, 20, 50);
    doc.text(`Reçu N° : ${cotisation.id.substring(0, 8).toUpperCase()}`, 130, 50);
    
    doc.setFontSize(14);
    doc.text("Membre :", 20, 70);
    doc.setFontSize(12);
    doc.text(`${cotisation.athletes.nom.toUpperCase()} ${cotisation.athletes.prenom}`, 20, 80);
    
    doc.setFillColor(248, 250, 252);
    doc.rect(20, 100, 170, 60, 'F');
    
    doc.text(`Montant payé :`, 30, 120);
    doc.setFontSize(16);
    doc.setTextColor(16, 185, 129);
    doc.text(`${cotisation.montant_paye} DZ`, 150, 120);
    
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`Mode de paiement : ${cotisation.mode_paiement}`, 30, 135);
    doc.text(`Couverture jusqu'au : ${new Date(cotisation.periode_couverte_fin).toLocaleDateString('fr-FR')}`, 30, 150);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text("Ce reçu atteste du paiement de la cotisation. Gardez-le précieusement.", 20, 270);
    
    doc.save(`Reçu_${cotisation.athletes.nom}_${new Date(cotisation.date_paiement).toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1>Finances</h1>
          <p>Gérez les cotisations et suivez les paiements.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={checkExpirations}>
            <AlertTriangle size={18} className="text-warning" /> Vérifier Expirations
          </Button>
          <Button variant="primary" onClick={() => { setShowPaymentForm(true); setEditingPaymentId(null); setFormData(initialFormState); }}>
            + Saisir un paiement
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-muted mb-0">Revenus du mois</h3>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-success)' }}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>{stats.totalThisMonth} DZ</div>
        </Card>

        <Card className="flex-col gap-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-muted mb-0">Revenus totaux</h3>
            <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-primary)' }}>
              <CreditCard size={20} />
            </div>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'Outfit' }}>{stats.totalRevenue} DZ</div>
        </Card>
        
        <Card className="flex-col gap-2 md:col-span-3 lg:col-span-1" style={{ minHeight: '150px' }}>
            <h3 className="text-sm font-semibold text-muted mb-2">Évolution des revenus ({new Date().getFullYear()})</h3>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--accent-success)', fontWeight: 'bold' }}
                    formatter={(value) => [`${value} DZ`, 'Revenus']}
                  />
                  <Bar dataKey="revenus" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted">Aucune donnée</div>
            )}
        </Card>
      </div>

      {showPaymentForm && (
        <Card className="mb-8 p-6">
          <h2 className="mb-4">{editingPaymentId ? 'Modifier Paiement' : 'Nouveau Paiement'}</h2>
          <form onSubmit={handlePaymentSubmit}>
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="form-group">
                <label className="form-label">Athlète *</label>
                <select 
                  name="athlete_id" 
                  value={formData.athlete_id} 
                  onChange={handleChange} 
                  className="form-select" 
                  required
                >
                  <option value="">Sélectionner un athlète</option>
                  {athletes.map(a => (
                    <option key={a.id} value={a.id}>{a.nom} {a.prenom}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Montant (DZ) *</label>
                <input 
                  type="number" 
                  step="0.01"
                  name="montant_paye" 
                  value={formData.montant_paye} 
                  onChange={handleChange} 
                  className="form-input" 
                  required 
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="form-group">
                <label className="form-label">Mode de paiement *</label>
                <select 
                  name="mode_paiement" 
                  value={formData.mode_paiement} 
                  onChange={handleChange} 
                  className="form-select" 
                  required
                >
                  <option value="Espèces">Espèces</option>
                  <option value="Virement">Virement</option>
                  <option value="Chèque">Chèque</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Valable jusqu'au (Date fin) *</label>
                <input 
                  type="date" 
                  name="periode_couverte_fin" 
                  value={formData.periode_couverte_fin} 
                  onChange={handleChange} 
                  className="form-input" 
                  required 
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-2">
              <Button type="button" variant="secondary" onClick={() => { setShowPaymentForm(false); setEditingPaymentId(null); setFormData(initialFormState); }}>Annuler</Button>
              <Button type="submit" variant="primary" disabled={loading}>{editingPaymentId ? 'Mettre à jour' : 'Enregistrer le paiement'}</Button>
            </div>
          </form>
        </Card>
      )}

      <Card noPadding>
        <div className="p-4 border-b flex flex-wrap justify-between items-center gap-4" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <h3 className="text-lg m-0">Historique des Cotisations</h3>
          
          <div className="flex flex-wrap gap-3">
            <div className="relative" style={{ width: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Nom ou prénom..." 
                className="form-input" 
                style={{ paddingLeft: '2.25rem', paddingRight: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
              />
            </div>
            
            <select 
              className="form-select" 
              style={{ width: '130px', padding: '0.5rem' }}
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="all">Tous les mois</option>
              <option value="0">Janvier</option>
              <option value="1">Février</option>
              <option value="2">Mars</option>
              <option value="3">Avril</option>
              <option value="4">Mai</option>
              <option value="5">Juin</option>
              <option value="6">Juillet</option>
              <option value="7">Août</option>
              <option value="8">Septembre</option>
              <option value="9">Octobre</option>
              <option value="10">Novembre</option>
              <option value="11">Décembre</option>
            </select>
            
            <select 
              className="form-select" 
              style={{ width: '100px', padding: '0.5rem' }}
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="all">Année</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
            </select>

            <Button variant="secondary" style={{ padding: '0.5rem 1rem' }} onClick={exportToCSV}>
              <Download size={16} /> Export
            </Button>
          </div>
        </div>
        
        {cotisLoading ? (
          <div className="p-8 flex flex-col gap-4">
            <Skeleton height="40px" />
            <Skeleton height="40px" />
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Date</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Athlète</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Montant</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Mode</th>
                  <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCotisations.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-muted">Aucune cotisation trouvée pour ces filtres.</td>
                  </tr>
                ) : filteredCotisations.map(cotis => (
                  <tr key={cotis.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '1rem' }}>
                      {new Date(cotis.date_paiement).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>
                      {cotis.athletes?.nom} {cotis.athletes?.prenom}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className="text-success font-semibold">{cotis.montant_paye} DZ</span>
                    </td>
                    <td style={{ padding: '1rem' }}>{cotis.mode_paiement}</td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="secondary" 
                          style={{ padding: '0.4rem 0.75rem' }}
                          onClick={() => handleEditClick(cotis)}
                        >
                          <Edit size={16} /> Modifier
                        </Button>
                        <Button 
                          variant="secondary" 
                          style={{ padding: '0.4rem 0.75rem' }}
                          onClick={() => generatePDFReceipt(cotis)}
                        >
                          <FileText size={16} /> Reçu PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
