import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, MoreVertical, QrCode, Edit, Printer, Download, Upload, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import BadgeGenerator from '../components/BadgeGenerator';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { useAthletes } from '../hooks/useAthletes';
import { Card, Button, Badge, Skeleton } from '../components/ui';

export default function AthletesList() {
  const { athletes, loading, fetchAthletes, archiveAthlete, toggleAccessStatus } = useAthletes();
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [selectedAthletes, setSelectedAthletes] = useState([]);
  const [showBulkPrint, setShowBulkPrint] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  const handleDelete = async (athleteId) => {
    if (!window.confirm("Voulez-vous vraiment archiver cet athlète ?")) return;
    await archiveAthlete(athleteId);
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
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
            <Upload size={18} /> Importer
          </Button>
          <Button variant="secondary" onClick={handleExport}>
            <Download size={18} /> Exporter
          </Button>

          {selectedAthletes.length > 0 && (
            <Button variant="secondary" onClick={() => setShowBulkPrint(true)}>
              <Printer size={18} /> Imprimer badges ({selectedAthletes.length})
            </Button>
          )}
          <Link to="/athletes/new" style={{ textDecoration: 'none' }}>
            <Button variant="primary">
              <Plus size={18} /> Ajouter
            </Button>
          </Link>
        </div>
      </div>

      <Card noPadding>
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
          <div className="p-8 flex flex-col gap-4">
            <Skeleton height="40px" />
            <Skeleton height="40px" />
            <Skeleton height="40px" />
          </div>
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
                  <td style={{ padding: '1rem 0' }}>{athlete.groupes?.nom || athlete.groupe || '-'}</td>
                  <td style={{ padding: '1rem' }}>{athlete.telephone || '-'}</td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      onClick={() => toggleAccessStatus(athlete.id, athlete.cartes_acces)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', transition: 'opacity 0.2s' }}
                      title="Cliquez pour changer le statut"
                    >
                      <Badge status={athlete.cartes_acces?.statut || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut)}>
                        {(athlete.cartes_acces?.statut === 'ACTIVE' || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut === 'ACTIVE'))
                          ? 'Active' : 'Suspendue'}
                      </Badge>
                    </button>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div className="flex justify-end gap-2">
                      <Link to={`/athletes/edit/${athlete.id}`}>
                        <Button variant="secondary" style={{ padding: '0.4rem 0.75rem' }}>
                          <Edit size={16} /> Modifier
                        </Button>
                      </Link>
                      <Button 
                        variant="secondary" 
                        style={{ padding: '0.4rem 0.75rem' }}
                        onClick={() => setSelectedAthlete(athlete)}
                      >
                        <QrCode size={16} /> Badge
                      </Button>
                      <Button 
                        variant="secondary" 
                        style={{ padding: '0.4rem 0.75rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                        onClick={() => handleDelete(athlete.id)}
                        title="Archiver l'athlète"
                      >
                        <Trash2 size={16} />
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
               <Button variant="primary" onClick={() => window.print()}>Imprimer</Button>
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
              <Button variant="secondary" onClick={() => setShowBulkPrint(false)}>Annuler</Button>
              <Button variant="primary" onClick={() => window.print()}>
                <Printer size={18} />
                Lancer l'impression
              </Button>
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
