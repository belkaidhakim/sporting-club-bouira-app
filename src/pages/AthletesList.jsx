import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, QrCode, Edit, Printer, Download, Upload, Trash2, Mail, MessageSquare, Send, CheckSquare } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import BadgeGenerator from '../components/BadgeGenerator';
import toast from 'react-hot-toast';
import Papa from 'papaparse';
import { useAthletes } from '../hooks/useAthletes';
import { useGroupes } from '../hooks/useGroupes';
import { Card, Button, Badge, Skeleton } from '../components/ui';

const getInitials = (nom = '', prenom = '') => {
  const n = (nom || '').trim().charAt(0).toUpperCase();
  const p = (prenom || '').trim().charAt(0).toUpperCase();
  return `${n}${p}` || '?';
};

const getAgeAndCategory = (dateNaissance) => {
  if (!dateNaissance) return { age: null, category: 'N/A', dateStr: '-' };
  const birth = new Date(dateNaissance);
  if (isNaN(birth.getTime())) return { age: null, category: 'N/A', dateStr: '-' };
  
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;

  let category = 'Senior';
  if (age < 7) category = 'Baby (U7)';
  else if (age <= 9) category = 'Poussin (U9)';
  else if (age <= 11) category = 'Pupille (U11)';
  else if (age <= 13) category = 'Benjamin (U13)';
  else if (age <= 15) category = 'Minime (U15)';
  else if (age <= 17) category = 'Cadet (U17)';
  else if (age <= 19) category = 'Junior (U20)';
  else if (age >= 35) category = 'Master (+35)';

  return { age, category, dateStr: birth.toLocaleDateString('fr-FR') };
};

const getCotisationStatus = (cotisationsArr, cardStatut) => {
  if (!cotisationsArr || cotisationsArr.length === 0) {
    return { label: 'Cotis. En attente', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
  }
  const sorted = [...cotisationsArr].sort((a, b) => new Date(b.periode_couverte_fin) - new Date(a.periode_couverte_fin));
  const latest = sorted[0];
  const endDate = new Date(latest.periode_couverte_fin);
  const now = new Date();

  const monthNames = ['Janv', 'Fév', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
  const monthName = monthNames[endDate.getMonth()];

  if (endDate < now || cardStatut === 'EXPIREE' || cardStatut === 'SUSPENDUE') {
    return { label: `Expiré (${monthName})`, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)' };
  } else {
    return { label: `Payé (${monthName})`, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
  }
};

const getPresenceGauge = (presencesArr) => {
  const count = Array.isArray(presencesArr) ? presencesArr.length : 0;
  const target = 8;
  const percent = Math.min(100, Math.round((count / target) * 100));
  
  let color = '#10b981';
  if (percent < 50) color = '#ef4444';
  else if (percent < 75) color = '#f59e0b';

  return { count, target, percent, color };
};

export default function AthletesList() {
  const [searchParams] = useSearchParams();
  const { athletes, loading, fetchAthletes, archiveAthlete, toggleAccessStatus } = useAthletes();
  const { groupes } = useGroupes();
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [genderFilter, setGenderFilter] = useState('all');
  const [selectedAthletes, setSelectedAthletes] = useState([]);
  const [showBulkPrint, setShowBulkPrint] = useState(false);
  const [showBulkMessageModal, setShowBulkMessageModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState("Sporting Club Bouira - Information");
  const [messageBody, setMessageBody] = useState("");
  const [messageTemplate, setMessageTemplate] = useState("horaire");
  const fileInputRef = useRef(null);

  const handleTemplateChange = (templateType) => {
    setMessageTemplate(templateType);
    if (templateType === "horaire") {
      setMessageSubject("Sporting Club Bouira - Changement d'horaire d'entraînement");
      setMessageBody("Bonjour,\n\nNous vous informons qu'un changement d'horaire aura lieu pour les prochains entraînements. Merci de consulter le planning mis à jour auprès du club.\n\nSportivement,\nL'équipe du Sporting Club Bouira");
    } else if (templateType === "paiement") {
      setMessageSubject("Sporting Club Bouira - Rappel de cotisation mensuelle");
      setMessageBody("Bonjour,\n\nCeci est un rappel concernant votre cotisation du mois. Merci de régulariser votre paiement auprès du secrétariat du club.\n\nCordialement,\nL'administration");
    } else if (templateType === "convocation") {
      setMessageSubject("Sporting Club Bouira - Convocation Compétition");
      setMessageBody("Bonjour,\n\nVous êtes convoqué(e) à la prochaine rencontre sportive du club. Merci de valider votre présence auprès de votre entraîneur.\n\nSportivement,\nLe Staff Technique");
    }
  };

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  useEffect(() => {
    const gParam = searchParams.get('groupe');
    const sParam = searchParams.get('search');
    if (gParam) {
      setGroupFilter(gParam);
      setSearchQuery('');
    } else if (sParam) {
      // Si sParam correspond à un nom de groupe existant, régler groupFilter
      setGroupFilter(sParam);
      setSearchQuery('');
    }
  }, [searchParams]);

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
    const nom = (athlete.nom || '').toLowerCase();
    const prenom = (athlete.prenom || '').toLowerCase();
    const groupeNom = (athlete.groupes?.nom || athlete.groupe || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const matchesSearch = !q || nom.includes(q) || prenom.includes(q) || groupeNom.includes(q);

    const gFilter = groupFilter.toLowerCase().trim();
    const matchesGroup = groupFilter === 'all' || 
                         groupeNom === gFilter || 
                         groupeNom.includes(gFilter) ||
                         String(athlete.groupe_id) === String(groupFilter);

    // Filtre par statut d'accès (ACTIVE / SUSPENDUE)
    const cardStatut = athlete.cartes_acces?.statut || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut) || 'ACTIVE';
    const matchesStatus = statusFilter === 'all' || cardStatut === statusFilter;

    // Filtre par sexe (M / F)
    const sexe = (athlete.sexe || '').trim().toUpperCase();
    const matchesGender = genderFilter === 'all' || sexe === genderFilter;

    return matchesSearch && matchesGroup && matchesStatus && matchesGender;
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

          <Link to="/athletes/new" style={{ textDecoration: 'none' }}>
            <Button variant="primary">
              <Plus size={18} /> Ajouter
            </Button>
          </Link>
        </div>
      </div>

      {/* BANDEAU D'ACTIONS EN LOT (DYNAMIQUE AU CLIC SUR LES CHECKBOXES) */}
      {selectedAthletes.length > 0 && (
        <div 
          className="p-3 px-5 mb-4 rounded-xl flex flex-wrap justify-between items-center gap-4 no-print"
          style={{
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.25)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div className="flex items-center gap-3">
            <CheckSquare size={20} style={{ color: 'var(--accent-primary-hover)' }} />
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
              {selectedAthletes.length} membre{selectedAthletes.length > 1 ? 's' : ''} sélectionné{selectedAthletes.length > 1 ? 's' : ''}
            </span>
            <button 
              onClick={() => setSelectedAthletes([])} 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Désélectionner tout
            </button>
          </div>

          <div className="flex flex-wrap gap-3 items-center">
            <Button 
              variant="secondary" 
              onClick={() => setShowBulkPrint(true)}
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', fontWeight: 600 }}
            >
              <Printer size={16} /> Badges en lot ({selectedAthletes.length})
            </Button>

            <Button 
              variant="primary" 
              onClick={() => {
                handleTemplateChange('horaire');
                setShowBulkMessageModal(true);
              }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
            >
              <MessageSquare size={16} /> Communication Groupée (SMS / Email)
            </Button>
          </div>
        </div>
      )}

      <Card noPadding>
        <div className="p-4 flex flex-wrap gap-3 items-center" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div className="relative" style={{ minWidth: '220px', flex: '1 1 200px' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
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
            style={{ width: '170px' }}
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
          >
            <option value="all">👥 Tous les groupes</option>
            {groupes.map(g => (
              <option key={g.id} value={g.nom}>{g.nom}</option>
            ))}
          </select>

          <select 
            className="form-select" 
            style={{ width: '160px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">⚡ Tous statuts</option>
            <option value="ACTIVE">🟢 Actifs</option>
            <option value="SUSPENDUE">🔴 Suspendus / Inactifs</option>
          </select>

          <select 
            className="form-select" 
            style={{ width: '140px' }}
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
          >
            <option value="all">🚻 Tous sexes</option>
            <option value="M">👨 Masculin (M)</option>
            <option value="F">👩 Féminin (F)</option>
          </select>
        </div>
        
        {loading ? (
          <div className="p-8 flex flex-col gap-4">
            <Skeleton height="40px" />
            <Skeleton height="40px" />
            <Skeleton height="40px" />
          </div>
        ) : (
          <>
          {/* Version Desktop (Tableau Enrichi) */}
          <div className="responsive-table-desktop table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
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
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Membre</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Catégorie / Naissance</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Groupe</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Cotisation</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Assiduité (Présence)</th>
                  <th style={{ padding: '1rem', fontWeight: '500' }}>Accès</th>
                  <th style={{ padding: '1rem', fontWeight: '500', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAthletes.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-muted">Aucun athlète trouvé.</td>
                  </tr>
                ) : filteredAthletes.map(athlete => {
                  const cardStatut = athlete.cartes_acces?.statut || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut);
                  const { age, category, dateStr } = getAgeAndCategory(athlete.date_naissance);
                  const cotisInfo = getCotisationStatus(athlete.cotisations, cardStatut);
                  const presence = getPresenceGauge(athlete.presences);

                  return (
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
                        <div className="flex items-center gap-3">
                          {athlete.photo_url ? (
                            <img 
                              src={athlete.photo_url} 
                              alt={`${athlete.nom} ${athlete.prenom}`} 
                              style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--accent-primary-hover)' }} 
                            />
                          ) : (
                            <div 
                              style={{ 
                                width: '38px', 
                                height: '38px', 
                                borderRadius: '50%', 
                                backgroundColor: 'rgba(99, 102, 241, 0.15)', 
                                border: '1.5px solid rgba(99, 102, 241, 0.3)', 
                                color: 'var(--accent-primary-hover)',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                fontWeight: 700, 
                                fontSize: '0.85rem' 
                              }}
                            >
                              {getInitials(athlete.nom, athlete.prenom)}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{athlete.nom} {athlete.prenom}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{athlete.sexe || '-'} • {athlete.telephone || 'Sans tél'}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div>
                          <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.08)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {category}
                          </span>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                            {age !== null ? `${age} ans` : '-'} ({dateStr})
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {athlete.groupes?.nom || athlete.groupe || '-'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '3px 10px', borderRadius: '12px', backgroundColor: cotisInfo.bg, color: cotisInfo.color, fontSize: '0.75rem', fontWeight: 600, display: 'inline-block' }}>
                          {cotisInfo.label}
                        </span>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <div style={{ minWidth: '110px' }}>
                          <div className="flex justify-between text-xs mb-1" style={{ fontSize: '0.75rem' }}>
                            <span style={{ fontWeight: 600 }}>{presence.count}/{presence.target} séances</span>
                            <span style={{ color: presence.color, fontWeight: 700 }}>{presence.percent}%</span>
                          </div>
                          <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${presence.percent}%`, backgroundColor: presence.color, borderRadius: '3px' }} />
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '1rem' }}>
                        <button 
                          onClick={() => toggleAccessStatus(athlete.id, athlete.cartes_acces)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', transition: 'opacity 0.2s' }}
                          title="Cliquez pour changer le statut"
                        >
                          <Badge status={cardStatut}>
                            {cardStatut === 'ACTIVE' ? 'Active' : 'Suspendue'}
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
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Version Mobile (Cartes Ergonomiques Enrichies) */}
          <div className="responsive-cards-mobile">
            {filteredAthletes.length === 0 ? (
              <div className="p-8 text-center text-muted">Aucun athlète trouvé.</div>
            ) : filteredAthletes.map(athlete => {
              const cardStatut = athlete.cartes_acces?.statut || (Array.isArray(athlete.cartes_acces) && athlete.cartes_acces[0]?.statut);
              const { age, category, dateStr } = getAgeAndCategory(athlete.date_naissance);
              const cotisInfo = getCotisationStatus(athlete.cotisations, cardStatut);
              const presence = getPresenceGauge(athlete.presences);

              return (
                <div 
                  key={athlete.id}
                  className="p-4 rounded-lg flex flex-col gap-3"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  {/* Haut: Avatar + Nom Prénom + Statut Accès */}
                  <div className="flex items-center justify-between w-full pb-2" style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <div className="flex items-center gap-3">
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
                        style={{ cursor: 'pointer', width: '18px', height: '18px' }}
                      />
                      {athlete.photo_url ? (
                        <img 
                          src={athlete.photo_url} 
                          alt="" 
                          style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--accent-primary-hover)' }} 
                        />
                      ) : (
                        <div 
                          style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '50%', 
                            backgroundColor: 'rgba(99, 102, 241, 0.15)', 
                            border: '1px solid rgba(99, 102, 241, 0.3)', 
                            color: 'var(--accent-primary-hover)',
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontWeight: 700, 
                            fontSize: '0.8rem' 
                          }}
                        >
                          {getInitials(athlete.nom, athlete.prenom)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {athlete.nom} {athlete.prenom}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Groupe: {athlete.groupes?.nom || athlete.groupe || '-'}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => toggleAccessStatus(athlete.id, athlete.cartes_acces)}
                      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                    >
                      <Badge status={cardStatut}>
                        {cardStatut === 'ACTIVE' ? 'Active' : 'Suspendue'}
                      </Badge>
                    </button>
                  </div>

                  {/* Ligne Badges: Catégorie & Cotisation */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: 'rgba(255,255,255,0.08)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {category} {age !== null ? `(${age} ans)` : ''}
                    </span>
                    <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: cotisInfo.bg, color: cotisInfo.color, fontSize: '0.75rem', fontWeight: 600 }}>
                      {cotisInfo.label}
                    </span>
                  </div>

                  {/* Jauge d'Assiduité / Présence */}
                  <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-muted)' }}>Assiduité : <strong>{presence.count}/{presence.target} séances</strong></span>
                      <span style={{ color: presence.color, fontWeight: 700 }}>{presence.percent}%</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${presence.percent}%`, backgroundColor: presence.color, borderRadius: '3px' }} />
                    </div>
                  </div>

                  {/* Détails complémentaires */}
                  <div className="flex justify-between text-xs text-muted">
                    <span>Né(e) le : <strong>{dateStr}</strong></span>
                    <span>Tél : <strong>{athlete.telephone || '-'}</strong></span>
                  </div>

                  {/* Bas: Boutons d'action centrés */}
                  <div className="flex justify-center gap-2 w-full pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <Link to={`/athletes/edit/${athlete.id}`}>
                      <Button variant="secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                        <Edit size={14} /> Modifier
                      </Button>
                    </Link>
                    <Button 
                      variant="secondary" 
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                      onClick={() => setSelectedAthlete(athlete)}
                    >
                      <QrCode size={14} /> Badge
                    </Button>
                    <Button 
                      variant="secondary" 
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                      onClick={() => handleDelete(athlete.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </Card>

      {selectedAthlete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="glass-panel p-6" style={{ width: '540px', maxWidth: '95vw', position: 'relative' }}>
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

      {/* MODALE DE COMMUNICATION GROUPÉE (SMS / E-MAIL) */}
      {showBulkMessageModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-panel p-6" style={{ width: '650px', maxWidth: '95vw', position: 'relative', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <button 
              onClick={() => setShowBulkMessageModal(false)} 
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.5rem' }}
            >
              &times;
            </button>

            <h2 className="mb-1 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <MessageSquare size={22} style={{ color: 'var(--accent-primary-hover)' }} /> Communication Groupée
            </h2>
            <p className="text-muted text-sm mb-4">
              Envoi d'un message aux <strong>{selectedAthletes.length} membres</strong> sélectionnés.
            </p>

            {/* Modèles de messages */}
            <div className="mb-4">
              <label className="form-label text-xs font-semibold text-muted mb-2 block">Modèles rapides :</label>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant={messageTemplate === 'horaire' ? 'primary' : 'secondary'} 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={() => handleTemplateChange('horaire')}
                >
                  📢 Horaire
                </Button>
                <Button 
                  variant={messageTemplate === 'paiement' ? 'primary' : 'secondary'} 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={() => handleTemplateChange('paiement')}
                >
                  💳 Cotisation
                </Button>
                <Button 
                  variant={messageTemplate === 'convocation' ? 'primary' : 'secondary'} 
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  onClick={() => handleTemplateChange('convocation')}
                >
                  🏆 Convocation
                </Button>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-xs font-semibold text-muted mb-1 block">Sujet de l'e-mail / Titre :</label>
              <input 
                type="text" 
                className="form-input" 
                value={messageSubject} 
                onChange={(e) => setMessageSubject(e.target.value)} 
              />
            </div>

            <div className="mb-4">
              <label className="form-label text-xs font-semibold text-muted mb-1 block">Contenu du message :</label>
              <textarea 
                className="form-input" 
                rows={5} 
                style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
              />
            </div>

            {/* Boutons d'action directes */}
            <div className="flex flex-wrap justify-between items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <Button 
                variant="secondary" 
                onClick={() => {
                  const selectedList = athletes.filter(a => selectedAthletes.includes(a.id));
                  const phoneNumbers = selectedList.map(a => a.telephone).filter(Boolean).join(', ');
                  navigator.clipboard.writeText(`Destinataires: ${phoneNumbers}\n\n${messageBody}`);
                  toast.success(`${selectedList.length} numéros et message copiés !`);
                }}
              >
                <MessageSquare size={16} /> Copier Texte & SMS ({selectedAthletes.length})
              </Button>

              <Button 
                variant="primary"
                onClick={() => {
                  const selectedList = athletes.filter(a => selectedAthletes.includes(a.id));
                  const emails = selectedList.map(a => a.email).filter(Boolean).join(',');
                  if (!emails) {
                    toast.error("Aucune adresse e-mail trouvée parmi les membres sélectionnés.");
                    return;
                  }
                  const mailtoUrl = `mailto:?bcc=${encodeURIComponent(emails)}&subject=${encodeURIComponent(messageSubject)}&body=${encodeURIComponent(messageBody)}`;
                  window.location.href = mailtoUrl;
                  toast.success("Client e-mail ouvert avec les destinataires en CCI !");
                }}
              >
                <Mail size={16} /> Envoyer par E-mail Groupé
              </Button>
            </div>
          </div>
        </div>
      )}

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
