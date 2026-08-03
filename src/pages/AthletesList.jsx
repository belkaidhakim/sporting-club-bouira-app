import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, MoreVertical, QrCode, Edit, Printer, Download, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import BadgeGenerator from '../components/BadgeGenerator';
import toast from 'react-hot-toast';
import Papa from 'papaparse';

export default function AthletesList() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [selectedAthletes, setSelectedAthletes] = useState([]);
  const [showBulkPrint, setShowBulkPrint] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAthletes();
  }, []);

  async function fetchAthletes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('athletes')
        .select(`
          *,
          cartes_acces (statut)
        `)
        .order('nom', { ascending: true });
        
      if (error) throw error;
      setAthletes(data || []);
    } catch (error) {
      console.error('Error fetching athletes:', error.message);
      toast.error('Erreur lors du chargement des athlètes');
    } finally {
      setLoading(false);
    }
  }

  const toggleStatus = async (athleteId, currentStatusObj) => {
    const currentStatus = Array.isArray(currentStatusObj) ? currentStatusObj[0]?.statut : currentStatusObj?.statut;
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDUE' : 'ACTIVE';
    
    try {
      const { error } = await supabase
        .from('cartes_acces')
        .update({ statut: newStatus })
        .eq('athlete_id', athleteId);
        
      if (error) throw error;
      
      setAthletes(athletes.map(a => {
        if (a.id === athleteId) {
          return {
            ...a,
            cartes_acces: Array.isArray(a.cartes_acces)
              ? [{ ...a.cartes_acces[0], statut: newStatus }]
              : { ...a.cartes_acces, statut: newStatus }
          };
        }
        return a;
      }));
      toast.success(`Statut mis à jour : ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error.message);
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const handleExport = () => {
    const exportData = filteredAthletes.map(a => ({
      nom: a.nom,
      prenom: a.prenom,
      sexe: a.sexe || '',
      groupe: a.groupe || '',
      date_naissance: a.date_naissance ? new Date(a.date_naissance).toLocaleDateString('fr-FR') : '',
      telephone: a.telephone || '',
      date_inscription: a.date_inscription ? new Date(a.date_inscription).toLocaleDateString('fr-FR') : ''
    }));

    const csv = Papa.unparse(exportData, { delimiter: ";" });
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `export_athletes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data;
        let importedCount = 0;
        let skippedCount = 0;

        for (const row of rows) {
          if (!row.nom || !row.prenom) {
            skippedCount++;
            continue;
          }

          const isDuplicate = athletes.some(a => 
            a.nom.toLowerCase() === row.nom.toLowerCase() && 
            a.prenom.toLowerCase() === row.prenom.toLowerCase()
          );

          if (isDuplicate) {
            skippedCount++;
            continue;
          }

          const token_qr = `CLUB-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          
          let date_naissance = null;
          if (row.date_naissance) {
            const parts = row.date_naissance.split('/');
            if (parts.length === 3) {
              date_naissance = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else {
              const d = new Date(row.date_naissance);
              if (!isNaN(d.getTime())) date_naissance = d.toISOString().split('T')[0];
            }
          }

          try {
            const { error } = await supabase
              .from('athletes')
              .insert([{
                nom: row.nom,
                prenom: row.prenom,
                sexe: row.sexe || null,
                groupe: row.groupe || null,
                telephone: row.telephone || null,
                date_naissance: date_naissance,
                token_qr
              }]);
              
            if (!error) importedCount++;
          } catch (err) {
            console.error("Erreur import", err);
          }
        }

        toast.success(`${importedCount} athlètes importés avec succès. ${skippedCount > 0 ? `(${skippedCount} ignorés car doublons)` : ''}`);
        
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchAthletes();
      },
      error: (error) => {
        console.error("Parse error:", error);
        toast.error("Erreur lors de la lecture du fichier CSV.");
        setLoading(false);
      }
    });
  };

  const filteredAthletes = athletes.filter(athlete => {
    const fullName = `${athlete.nom} ${athlete.prenom}`.toLowerCase();
    const matchesSearch = fullName.includes(searchQuery.toLowerCase());
    const matchesGroup = groupFilter === 'all' || athlete.groupe === groupFilter;
    return matchesSearch && matchesGroup;
  });

  return (
    <div>
      <div className="no-print">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1>Athlètes</h1>
          <p>Gérez les membres de votre club et leurs informations.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleImport} 
            style={{ display: 'none' }} 
          />
          <button className="btn btn-secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} />
            Importer
          </button>
          <button className="btn btn-secondary" onClick={handleExport}>
            <Download size={18} />
            Exporter
          </button>

          {selectedAthletes.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setShowBulkPrint(true)}>
              <Printer size={18} />
              Imprimer badges ({selectedAthletes.length})
            </button>
          )}
          <Link to="/athletes/new" className="btn btn-primary">
            <Plus size={18} />
            Ajouter
          </Link>
        </div>
      </div>

      <div className="glass-panel">
        <div className="p-4" style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="relative" style={{ width: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Rechercher par nom..." 
              className="form-input" 
              style={{ paddingLeft: '2.5rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select 
            className="form-select" 
            style={{ width: '180px' }}
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="all">Tous les groupes</option>
            <option value="Initiation">Initiation</option>
            <option value="Apprentissage">Apprentissage</option>
            <option value="Entraînement">Entraînement</option>
          </select>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-muted">Chargement...</div>
        ) : (
          <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem', width: '40px' }}>
                  <input 
                    type="checkbox" 
                    checked={filteredAthletes.length > 0 && selectedAthletes.length === filteredAthletes.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedAthletes(filteredAthletes.map(a => a.id));
                      } else {
                        setSelectedAthletes([]);
                      }
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                </th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Nom Prénom</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Sexe</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Groupe</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Téléphone</th>
                <th style={{ padding: '1rem', fontWeight: '500' }}>Statut</th>
                <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAthletes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-muted">Aucun athlète trouvé.</td>
                </tr>
              ) : filteredAthletes.map(athlete => (
                <tr key={athlete.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedAthletes.includes(athlete.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAthletes(prev => [...prev, athlete.id]);
                        } else {
                          setSelectedAthletes(prev => prev.filter(id => id !== athlete.id));
                        }
                      }}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div className="font-medium">{athlete.nom} {athlete.prenom}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{athlete.sexe || '-'}</td>
                  <td style={{ padding: '1rem' }}>{athlete.groupe || '-'}</td>
                  <td style={{ padding: '1rem' }}>{athlete.telephone || '-'}</td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      onClick={() => toggleStatus(athlete.id, athlete.cartes_acces)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', transition: 'opacity 0.2s' }}
                      title="Cliquez pour changer le statut"
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      {(athlete.cartes_acces?.statut === 'ACTIVE' || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut === 'ACTIVE'))
                        ? <span className="badge badge-active">Active</span> 
                        : <span className="badge badge-suspended">Suspendue</span>
                      }
                    </button>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div className="flex justify-end gap-2">
                      <Link 
                        to={`/athletes/edit/${athlete.id}`}
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.75rem' }}
                      >
                        <Edit size={16} />
                        Modifier
                      </Link>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.4rem 0.75rem' }}
                        onClick={() => setSelectedAthlete(athlete)}
                      >
                        <QrCode size={16} />
                        Badge
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {selectedAthlete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel p-6" style={{ width: '400px', position: 'relative' }}>
            <button 
              onClick={() => setSelectedAthlete(null)} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.5rem' }}
            >
              &times;
            </button>
            <h2 className="mb-4 text-center">Badge d'accès</h2>
            <BadgeGenerator athlete={selectedAthlete} />
            <div className="mt-6 flex justify-center">
               <button className="btn btn-primary" onClick={() => window.print()}>Imprimer</button>
            </div>
          </div>
        </div>
      )}
      </div>

      {showBulkPrint && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'var(--bg-color)', zIndex: 100, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
          <div className="p-4 flex justify-between items-center no-print" style={{ backgroundColor: 'var(--panel-bg)', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
            <h2>Impression multiple ({selectedAthletes.length} badges)</h2>
            <div className="flex gap-4">
              <button className="btn btn-secondary" onClick={() => setShowBulkPrint(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={() => window.print()}>
                <Printer size={18} />
                Lancer l'impression
              </button>
            </div>
          </div>
          
          <div className="p-8 print-container flex flex-wrap gap-8 justify-center items-start" style={{ minHeight: '100vh', backgroundColor: '#e2e8f0' }}>
            {athletes.filter(a => selectedAthletes.includes(a.id)).map(athlete => (
              <div key={athlete.id} className="badge-wrapper-print" style={{ pageBreakInside: 'avoid' }}>
                <BadgeGenerator athlete={athlete} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
