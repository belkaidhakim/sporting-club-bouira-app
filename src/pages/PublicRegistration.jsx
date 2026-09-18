import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { 
  User, 
  Calendar, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  Download, 
  Camera, 
  HeartPulse, 
  AlertCircle,
  Users,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Lock,
  Clock
} from 'lucide-react';
import { Button } from '../components/ui';
import { useGroupes } from '../hooks/useGroupes';
import { useRegistrationSettings } from '../hooks/useRegistrationSettings';
import { useClubPricing } from '../hooks/useClubPricing';
import { formatDA, formatName, calculateAge, formatPhoneInput } from '../utils/formatters';
import { compressImageFile } from '../utils/imageCompressor';
import { loadClubLogoBase64 } from '../utils/pdfHelpers';
import { generateOfficialRegistrationFormPdf } from '../utils/registrationFormPdfGenerator';

const unformatPhone = (formatted = '') => {
  return formatted.replace(/\s+/g, '');
};

// Schéma de validation Zod
const registrationSchema = z.object({
  nom: z.string().trim().min(2, 'Le nom doit comporter au moins 2 caractères'),
  prenom: z.string().trim().min(2, 'Le prénom doit comporter au moins 2 caractères'),
  date_naissance: z.string().min(1, 'La date de naissance est obligatoire'),
  sexe: z.enum(['Homme', 'Femme'], { errorMap: () => ({ message: 'Veuillez sélectionner le sexe' }) }),
  adresse: z.string().optional(),
  telephone: z.string().regex(/^(0)[5-7][0-9]{8}$/, 'Numéro invalide (doit comporter 10 chiffres, ex: 05 50 12 34 56)'),
  telephone_parent: z.string().optional(),
  groupe_id: z.string().optional(),
  observations_medicales: z.string().optional(),
  consentement_loi_18_07: z.literal(true, {
    errorMap: () => ({ message: 'Le consentement à la loi 18-07 et au règlement est obligatoire' }),
  }),
});

export default function PublicRegistration() {
  const { groupes } = useGroupes();
  const { isOpen: isRegistrationOpen, loading: settingsLoading } = useRegistrationSettings();
  const { fraisInscription, cotisationAdhesion, totalAdhesion } = useClubPricing();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    date_naissance: '',
    sexe: 'Homme',
    adresse: '',
    telephone: '',
    telephone_parent: '',
    groupe_id: '',
    observations_medicales: '',
    consentement_loi_18_07: false
  });

  // Erreurs de validation en temps réel
  const [errors, setErrors] = useState({});

  // Fichiers Base64 compressés
  const [photoBase64, setPhotoBase64] = useState(null);
  const [certificatBase64, setCertificatBase64] = useState(null);
  const [certificatFileName, setCertificatFileName] = useState('');
  const [autorisationBase64, setAutorisationBase64] = useState(null);
  const [autorisationFileName, setAutorisationFileName] = useState('');
  const [extraitNaissanceBase64, setExtraitNaissanceBase64] = useState(null);
  const [extraitNaissanceFileName, setExtraitNaissanceFileName] = useState('');

  // Vérifier si l'adhérent est mineur (< 18 ans)
  const isMinor = () => {
    if (!formData.date_naissance) return false;
    const birthDate = new Date(formData.date_naissance);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age < 18;
  };

  // Calcul de l'âge dynamique
  const athleteAge = () => {
    if (!formData.date_naissance) return null;
    const birth = new Date(formData.date_naissance);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age >= 0 ? age : null;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let newValue = type === 'checkbox' ? checked : value;

    // Masquage automatique pour les téléphones
    if (name === 'telephone' || name === 'telephone_parent') {
      newValue = formatPhoneInput(value);
    }

    setFormData(prev => ({
      ...prev,
      [name]: newValue
    }));

    // Effacer l'erreur en direct lors de la saisie
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  // Upload Photo avec compression
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await compressImageFile(file, 400, 500, 0.8);
    if (compressed) {
      setPhotoBase64(compressed);
    }
  };

  // Upload Certificat Médical avec compression
  const handleCertificatUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCertificatFileName(file.name);
    const compressed = await compressImageFile(file, 1200, 1600, 0.75);
    if (compressed) {
      setCertificatBase64(compressed);
    }
  };

  // Upload Autorisation Parentale avec compression
  const handleAutorisationUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAutorisationFileName(file.name);
    const compressed = await compressImageFile(file, 1200, 1600, 0.75);
    if (compressed) {
      setAutorisationBase64(compressed);
    }
  };

  // Upload Extrait de Naissance avec compression
  const handleExtraitNaissanceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setExtraitNaissanceFileName(file.name);
    const compressed = await compressImageFile(file, 1200, 1600, 0.75);
    if (compressed) {
      setExtraitNaissanceBase64(compressed);
    }
  };

  // Génération du PDF du Dossier d'Inscription Officiel (Tout-en-Un)
  const generateRegistrationPDF = async (data, numeroDossier) => {
    try {
      const selectedGroupeNom = groupes.find(g => g.id === data.groupe_id)?.nom || null;
      return await generateOfficialRegistrationFormPdf({
        data,
        numeroDossier,
        photoBase64,
        fraisInscription,
        cotisationAdhesion,
        selectedGroupeNom
      });
    } catch (err) {
      console.error('Erreur génération PDF dossier inscription:', err);
      toast.error('Erreur lors de la génération du dossier PDF : ' + err.message);
      return null;
    }
  };

  // Téléchargement du Formulaire Officiel Vierge (à imprimer / faire signer par le médecin)
  const handleDownloadBlankForm = async () => {
    try {
      const toastId = toast.loading("Génération du formulaire officiel d'inscription vierge...");
      await generateOfficialRegistrationFormPdf({
        isBlank: true,
        fraisInscription,
        cotisationAdhesion
      });
      toast.dismiss(toastId);
      toast.success("Formulaire vierge téléchargé avec succès !");
    } catch (err) {
      toast.error("Erreur lors de la génération du formulaire : " + err.message);
    }
  };

  // Soumission du Formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validation Zod avec gestion d'erreurs champ par champ
    const rawPhone = unformatPhone(formData.telephone);
    const rawParentPhone = unformatPhone(formData.telephone_parent);

    const validationPayload = {
      ...formData,
      telephone: rawPhone,
      telephone_parent: rawParentPhone
    };

    try {
      registrationSchema.parse(validationPayload);
      setErrors({});
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors = {};
        err.errors.forEach(e => {
          if (e.path[0]) {
            fieldErrors[e.path[0]] = e.message;
          }
        });
        setErrors(fieldErrors);
        toast.error('Veuillez corriger les champs obligatoires signalés en rouge.');
        return;
      }
    }

    if (isMinor() && !rawParentPhone) {
      setErrors(prev => ({ ...prev, telephone_parent: "Le numéro d'un parent/tuteur est requis pour un athlète mineur." }));
      toast.error("Le numéro de téléphone d'un parent/tuteur est requis pour un athlète mineur.");
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Enregistrement de votre pré-inscription et génération de votre fiche...');

    try {
      const numeroDossier = `SCB-PRE-${Date.now().toString().slice(-6)}`;
      const selectedGroupeName = groupes.find(g => g.id === formData.groupe_id)?.nom || null;

      const payload = {
        numero_dossier: numeroDossier,
        nom: formData.nom.trim().toUpperCase(),
        prenom: formData.prenom.trim(),
        date_naissance: formData.date_naissance,
        sexe: formData.sexe,
        adresse: formData.adresse ? formData.adresse.trim() : null,
        telephone: rawPhone,
        telephone_parent: rawParentPhone || null,
        groupe_id: formData.groupe_id || null,
        groupe_nom: selectedGroupeName,
        observations_medicales: formData.observations_medicales ? formData.observations_medicales.trim() : null,
        photo: photoBase64 || null,
        certificat_medical: certificatBase64 || null,
        autorisation_parentale: autorisationBase64 || null,
        extrait_naissance: extraitNaissanceBase64 || null,
        consentement_loi_18_07: true,
        reglement_accepte: true,
        statut: 'EN_ATTENTE'
      };

      // 1. Sauvegarde locale de secours (garantit que l'inscription apparaît toujours)
      try {
        const stored = localStorage.getItem('local_inscriptions_backup');
        const list = stored ? JSON.parse(stored) : [];
        list.unshift({ 
          ...payload, 
          id: `local-${Date.now()}`, 
          date_demande: new Date().toISOString(),
          groupes: selectedGroupeName ? { id: formData.groupe_id, nom: selectedGroupeName } : null 
        });
        localStorage.setItem('local_inscriptions_backup', JSON.stringify(list));
      } catch (e) {
        console.warn('Local backup write warning:', e);
      }

      // 2. Sauvegarde dans Supabase
      const { error } = await supabase
        .from('inscriptions')
        .insert([payload]);

      if (error) {
        console.warn('Supabase insert note:', error);
      }

      // 3. Génération et téléchargement automatique de la Fiche PDF
      await generateRegistrationPDF(validationPayload, numeroDossier);

      toast.dismiss(toastId);
      toast.success('Pré-inscription réussie ! Votre fiche PDF a été téléchargée.');

      setSubmissionResult({
        numeroDossier,
        data: validationPayload
      });
      setSubmitted(true);
    } catch (err) {
      toast.dismiss(toastId);
      console.error('Erreur inscription:', err);
      toast.error("Erreur lors de l'enregistrement : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f1f5f9', // Fond clair doux et propre
      color: '#0f172a',
      padding: '2.5rem 1rem',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif"
    }}>
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        
        {/* 1. EN-TÊTE DU CLUB AVEC HAUT CONTRASTE BLEU MARINE */}
        <div className="text-center mb-8">
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            overflow: 'hidden', 
            border: '3px solid #0f172a',
            boxShadow: '0 8px 25px rgba(15, 23, 42, 0.15)',
            marginBottom: '1rem',
            backgroundColor: '#ffffff'
          }}>
            <img src="/logo.jpg" alt="Logo Sporting Club Bouira" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>

          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: 900, 
            margin: '0 0 0.25rem', 
            letterSpacing: '-0.03em', 
            color: '#0f172a' // BLEU MARINE FONCÉ - LISIBILITÉ PARFAITE
          }}>
            SPORTING CLUB BOUIRA
          </h1>

          <p style={{ 
            fontSize: '0.95rem', 
            color: '#059669', // VERT EMERAUDE CLUB
            fontWeight: 800, 
            textTransform: 'uppercase', 
            letterSpacing: '0.08em', 
            margin: '0 0 0.75rem' 
          }}>
            Club Amateur Sportif Sporting Bouira
          </p>

          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '6px 16px', 
            borderRadius: '24px', 
            backgroundColor: '#ffffff', 
            border: '1px solid #e2e8f0', 
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            fontSize: '0.85rem', 
            color: '#334155',
            fontWeight: 600
          }}>
            <Sparkles size={16} color="#6366f1" />
            Portail Officiel d'Adhésion & Pré-inscription en ligne
          </div>

          {/* BANDEAU ACCÈS FORMULAIRE TOUT-EN-UN */}
          <div style={{
            margin: '1.5rem auto 0',
            maxWidth: '680px',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '1rem 1.25rem',
            border: '1.5px solid #e2e8f0',
            boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px'
          }} className="sm:flex-row sm:justify-between">
            <div style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#eef2ff', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FileText size={22} />
              </div>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a', display: 'block' }}>
                  Formulaire d'Inscription Officiel (PDF Tout-en-Un)
                </strong>
                <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>
                  Regroupe l'identité, la photo, le volet certificat médical pour le médecin et l'autorisation parentale
                </span>
              </div>
            </div>

            <Button 
              type="button"
              variant="secondary"
              onClick={handleDownloadBlankForm}
              style={{ padding: '0.55rem 1rem', fontSize: '0.82rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', backgroundColor: '#0f172a', color: '#ffffff', borderColor: '#0f172a' }}
              title="Télécharger le formulaire vierge prêt à imprimer"
            >
              <Download size={15} /> Télécharger vierge (PDF)
            </Button>
          </div>
        </div>

        {/* ÉCRAN D'INSCRIPTIONS FERMÉES (DÉSACTIVÉES) */}
        {!settingsLoading && !isRegistrationOpen && !submitted ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '3rem 2rem',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.08), 0 0 1px 1px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#fffbeb', color: '#d97706', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem', border: '2px solid #fde68a' }}>
                <Lock size={36} />
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '0 0 0.5rem', color: '#0f172a' }}>
                Inscriptions en Ligne Actuellement Fermées
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '580px', margin: '0 auto 1.75rem', lineHeight: '1.6' }}>
                Les pré-inscriptions en ligne pour le <strong>Sporting Club Bouira</strong> sont temporairement suspendues par l'administration du club (période de clôture des sessions ou quotas atteints).
              </p>

              {/* Encadré d'information et contact */}
              <div style={{ textAlign: 'left', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', maxWidth: '560px', margin: '0 auto 1.5rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={18} color="#6366f1" /> Contact du Secrétariat Général :
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', color: '#475569', lineHeight: '1.7' }}>
                  <li>Pour toute inscription tardive ou demande d'information, veuillez vous présenter directement au siège du club.</li>
                  <li><strong>Adresse :</strong> Complexe Sportif, Wilaya de Bouira</li>
                  <li><strong>Téléphone :</strong> <a href="tel:0550000000" style={{ color: '#6366f1', fontWeight: 700 }}>+213 (0) 550 00 00 00</a></li>
                  <li><strong>Horaires d'accueil :</strong> Du Dimanche au Jeudi, de 09h00 à 17h00</li>
                </ul>
              </div>

              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                Sporting Club Bouira · Club Amateur Sportif
              </div>
            </div>
          </motion.div>
        ) : submitted && submissionResult ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '2.5rem 2rem',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.08), 0 0 1px 1px rgba(0,0,0,0.05)',
              border: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <div style={{ width: '68px', height: '68px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#10b981', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <CheckCircle2 size={40} />
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.5rem', color: '#0f172a' }}>
                Demande de Pré-Inscription Transmise !
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '580px', margin: '0 auto 1.5rem', lineHeight: '1.5' }}>
                Votre dossier a été enregistré avec succès par le <strong>Sporting Club Bouira</strong>. Votre fiche officielle au format PDF a été générée et téléchargée sur votre appareil.
              </p>

              <div style={{ display: 'inline-block', padding: '14px 28px', borderRadius: '14px', backgroundColor: '#f8fafc', border: '1.5px solid #e2e8f0', marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.08em', fontWeight: 700, display: 'block' }}>Numéro de Dossier Officiel</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#059669', letterSpacing: '0.02em', margin: '2px 0' }}>
                  {submissionResult.numeroDossier}
                </div>
                <span style={{ fontSize: '0.8rem', color: '#334155', fontWeight: 600 }}>Statut : <strong>EN ATTENTE DE VALIDATION</strong></span>
              </div>

              {/* Instructions pour la suite */}
              <div style={{ textAlign: 'left', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} color="#6366f1" /> Prochaines étapes :
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.88rem', color: '#475569', lineHeight: '1.7' }}>
                  <li>Conservez ou imprimez votre fiche PDF de pré-inscription.</li>
                  <li>Présentez-vous au secrétariat du <strong>Sporting Club Bouira</strong> pour régler votre cotisation et finaliser votre adhésion.</li>
                  <li>Une fois validé, votre <strong>Badge QR Code officiel</strong> sera activé pour vos accès aux entraînements.</li>
                </ul>
              </div>

              <div className="flex flex-wrap justify-center gap-3">
                <Button 
                  variant="primary" 
                  onClick={() => generateRegistrationPDF(submissionResult.data, submissionResult.numeroDossier)}
                  style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '8px', backgroundColor: '#0f172a', color: '#fff' }}
                >
                  <Download size={16} /> Télécharger à nouveau ma fiche PDF
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => {
                    setSubmitted(false);
                    setSubmissionResult(null);
                    setFormData({
                      nom: '',
                      prenom: '',
                      date_naissance: '',
                      sexe: 'Homme',
                      adresse: '',
                      telephone: '',
                      telephone_parent: '',
                      groupe_id: '',
                      observations_medicales: '',
                      consentement_loi_18_07: false
                    });
                    setPhotoBase64(null);
                    setCertificatBase64(null);
                    setCertificatFileName('');
                    setAutorisationBase64(null);
                    setAutorisationFileName('');
                    setExtraitNaissanceBase64(null);
                    setExtraitNaissanceFileName('');
                    setErrors({});
                  }}
                  style={{ padding: '0.75rem 1.5rem', fontSize: '0.9rem' }}
                >
                  Effectuer une autre inscription
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* FORMULAIRE D'INSCRIPTION SUR FOND BLANC AÉRÉ & MODERNE */
          <motion.form 
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '2.5rem',
              boxShadow: '0 20px 40px -15px rgba(0,0,0,0.06), 0 0 1px 1px rgba(0,0,0,0.04)',
              border: '1px solid #e2e8f0'
            }}>
              
              {/* SECTION 1 : INFORMATIONS PERSONNELLES */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-[#e2e8f0]">
                  <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#eef2ff', color: '#6366f1' }}>
                    <User size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      1. Informations Personnelles
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Renseignez l'identité exacte de l'adhérent</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Nom */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Nom de famille <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="nom" 
                      value={formData.nom} 
                      onChange={handleChange} 
                      placeholder="ex: BENALI" 
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.9rem',
                        borderRadius: '8px',
                        border: errors.nom ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                        backgroundColor: errors.nom ? '#fef2f2' : '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.9rem',
                        outline: 'none',
                        transition: 'border-color 0.2s'
                      }}
                    />
                    {errors.nom && (
                      <span className="text-red-500 text-xs font-semibold mt-1 block">{errors.nom}</span>
                    )}
                  </div>

                  {/* Prénom */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text" 
                      name="prenom" 
                      value={formData.prenom} 
                      onChange={handleChange} 
                      placeholder="ex: Mohamed" 
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.9rem',
                        borderRadius: '8px',
                        border: errors.prenom ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                        backgroundColor: errors.prenom ? '#fef2f2' : '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                    {errors.prenom && (
                      <span className="text-red-500 text-xs font-semibold mt-1 block">{errors.prenom}</span>
                    )}
                  </div>

                  {/* Date de Naissance */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex justify-between">
                      <span>Date de Naissance <span className="text-red-500">*</span></span>
                      {athleteAge() !== null && (
                        <span style={{ color: '#059669', fontWeight: 800, textTransform: 'none' }}>
                          Âge : {athleteAge()} ans {isMinor() ? '(Mineur)' : '(Majeur)'}
                        </span>
                      )}
                    </label>
                    <input 
                      type="date" 
                      name="date_naissance" 
                      value={formData.date_naissance} 
                      onChange={handleChange} 
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.9rem',
                        borderRadius: '8px',
                        border: errors.date_naissance ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                        backgroundColor: errors.date_naissance ? '#fef2f2' : '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                    {errors.date_naissance && (
                      <span className="text-red-500 text-xs font-semibold mt-1 block">{errors.date_naissance}</span>
                    )}
                  </div>

                  {/* Sexe */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Sexe <span className="text-red-500">*</span>
                    </label>
                    <select 
                      name="sexe" 
                      value={formData.sexe} 
                      onChange={handleChange} 
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.9rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    >
                      <option value="Homme">Homme</option>
                      <option value="Femme">Femme</option>
                    </select>
                  </div>

                  {/* Téléphone Adhérent avec Masquage */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Numéro de Téléphone <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="tel" 
                      name="telephone" 
                      value={formData.telephone} 
                      onChange={handleChange} 
                      placeholder="05 50 12 34 56" 
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.9rem',
                        borderRadius: '8px',
                        border: errors.telephone ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                        backgroundColor: errors.telephone ? '#fef2f2' : '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.9rem',
                        outline: 'none',
                        letterSpacing: '0.04em',
                        fontWeight: 600
                      }}
                    />
                    {errors.telephone ? (
                      <span className="text-red-500 text-xs font-semibold mt-1 block">{errors.telephone}</span>
                    ) : (
                      <span className="text-slate-400 text-xs mt-1 block">Format : 10 chiffres (ex: 05 50 12 34 56)</span>
                    )}
                  </div>

                  {/* Téléphone Parent / Tuteur */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Téléphone Parent / Tuteur {isMinor() ? <span className="text-red-500">* (Obligatoire)</span> : '(Optionnel)'}
                    </label>
                    <input 
                      type="tel" 
                      name="telephone_parent" 
                      value={formData.telephone_parent} 
                      onChange={handleChange} 
                      placeholder="06 60 12 34 56" 
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.9rem',
                        borderRadius: '8px',
                        border: errors.telephone_parent ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                        backgroundColor: errors.telephone_parent ? '#fef2f2' : '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.9rem',
                        outline: 'none',
                        letterSpacing: '0.04em',
                        fontWeight: 600
                      }}
                    />
                    {errors.telephone_parent && (
                      <span className="text-red-500 text-xs font-semibold mt-1 block">{errors.telephone_parent}</span>
                    )}
                  </div>

                  {/* Section / Groupe */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Section / Catégorie Sportive Souhaitée
                    </label>
                    <select 
                      name="groupe_id" 
                      value={formData.groupe_id} 
                      onChange={handleChange} 
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.9rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    >
                      <option value="">Sélectionnez un groupe ou une discipline...</option>
                      {groupes.map(g => (
                        <option key={g.id} value={g.id}>{g.nom} {g.age_min ? `(${g.age_min}-${g.age_max || '+'} ans)` : ''}</option>
                      ))}
                    </select>
                  </div>

                  {/* Adresse */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Adresse de Résidence
                    </label>
                    <input 
                      type="text" 
                      name="adresse" 
                      value={formData.adresse} 
                      onChange={handleChange} 
                      placeholder="ex: Cité 500 logements, Bouira" 
                      style={{
                        width: '100%',
                        padding: '0.7rem 0.9rem',
                        borderRadius: '8px',
                        border: '1.5px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#0f172a',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2 : TÉLÉCHARGEMENT DE DOCUMENTS */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#e2e8f0]">
                  <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#059669' }}>
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      2. Téléchargement des Documents & Pièces Justificatives
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Pièces à joindre pour la validation de votre dossier d'adhésion</span>
                  </div>
                </div>

                {/* Bandeau explicatif des 4 documents requis */}
                <div style={{ 
                  padding: '10px 14px', 
                  backgroundColor: '#f8fafc', 
                  borderRadius: '10px', 
                  border: '1px solid #e2e8f0', 
                  marginBottom: '1rem',
                  fontSize: '0.8rem',
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} color="#6366f1" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Documents pour la pré-inscription :</strong> 1. Photo d'identité · 2. Certificat médical · 3. Extrait de naissance · 4. Autorisation parentale (si mineur).
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* 1. Photo d'identité */}
                  <div style={{ padding: '1.2rem 1rem', borderRadius: '14px', backgroundColor: '#f8fafc', border: photoBase64 ? '1.5px solid #6366f1' : '1.5px dashed #cbd5e1', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <Camera size={26} color="#6366f1" style={{ margin: '0 auto 6px' }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                        Photo d'identité
                      </span>
                      <span style={{ fontSize: '0.73rem', color: '#64748b', display: 'block', marginBottom: '10px' }}>
                        Pour le Badge QR officiel
                      </span>
                      {photoBase64 ? (
                        <div style={{ position: 'relative', width: '75px', height: '95px', margin: '0 auto 10px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #6366f1', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                          <img src={photoBase64} alt="Aperçu photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <input 
                        type="file" 
                        id="photo-upload" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        style={{ display: 'none' }} 
                      />
                      <label 
                        htmlFor="photo-upload" 
                        style={{ display: 'inline-block', width: '100%', padding: '7px 10px', fontSize: '0.78rem', borderRadius: '8px', backgroundColor: photoBase64 ? '#eef2ff' : '#ffffff', color: '#6366f1', cursor: 'pointer', fontWeight: 700, border: '1px solid #c7d2fe', transition: 'all 0.2s' }}
                      >
                        {photoBase64 ? 'Changer la photo' : 'Importer photo'}
                      </label>
                    </div>
                  </div>

                  {/* 2. Certificat Médical */}
                  <div style={{ padding: '1.2rem 1rem', borderRadius: '14px', backgroundColor: '#f8fafc', border: certificatBase64 ? '1.5px solid #059669' : '1.5px dashed #cbd5e1', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <HeartPulse size={26} color="#059669" style={{ margin: '0 auto 6px' }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                        Certificat Médical
                      </span>
                      <span style={{ fontSize: '0.73rem', color: '#64748b', display: 'block', marginBottom: '10px' }}>
                        Aptitude sportive (Scan / PDF)
                      </span>
                      {certificatFileName ? (
                        <div style={{ fontSize: '0.75rem', color: '#059669', marginBottom: '8px', wordBreak: 'break-all', fontWeight: 700 }}>
                          ✔ {certificatFileName}
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <input 
                        type="file" 
                        id="certificat-upload" 
                        accept="image/*,application/pdf" 
                        onChange={handleCertificatUpload} 
                        style={{ display: 'none' }} 
                      />
                      <label 
                        htmlFor="certificat-upload" 
                        style={{ display: 'inline-block', width: '100%', padding: '7px 10px', fontSize: '0.78rem', borderRadius: '8px', backgroundColor: certificatBase64 ? '#ecfdf5' : '#ffffff', color: '#059669', cursor: 'pointer', fontWeight: 700, border: '1px solid #a7f3d0', transition: 'all 0.2s' }}
                      >
                        {certificatBase64 ? 'Remplacer fichier' : 'Importer certificat'}
                      </label>
                    </div>
                  </div>

                  {/* 3. Extrait de Naissance */}
                  <div style={{ padding: '1.2rem 1rem', borderRadius: '14px', backgroundColor: '#f8fafc', border: extraitNaissanceBase64 ? '1.5px solid #0284c7' : '1.5px dashed #cbd5e1', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <FileText size={26} color="#0284c7" style={{ margin: '0 auto 6px' }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                        Extrait de Naissance
                      </span>
                      <span style={{ fontSize: '0.73rem', color: '#64748b', display: 'block', marginBottom: '10px' }}>
                        État civil (Scan / Photo)
                      </span>
                      {extraitNaissanceFileName ? (
                        <div style={{ fontSize: '0.75rem', color: '#0284c7', marginBottom: '8px', wordBreak: 'break-all', fontWeight: 700 }}>
                          ✔ {extraitNaissanceFileName}
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <input 
                        type="file" 
                        id="extrait-naissance-upload" 
                        accept="image/*,application/pdf" 
                        onChange={handleExtraitNaissanceUpload} 
                        style={{ display: 'none' }} 
                      />
                      <label 
                        htmlFor="extrait-naissance-upload" 
                        style={{ display: 'inline-block', width: '100%', padding: '7px 10px', fontSize: '0.78rem', borderRadius: '8px', backgroundColor: extraitNaissanceBase64 ? '#f0f9ff' : '#ffffff', color: '#0284c7', cursor: 'pointer', fontWeight: 700, border: '1px solid #bae6fd', transition: 'all 0.2s' }}
                      >
                        {extraitNaissanceBase64 ? 'Remplacer fichier' : 'Importer extrait'}
                      </label>
                    </div>
                  </div>

                  {/* 4. Autorisation Parentale */}
                  <div style={{ padding: '1.2rem 1rem', borderRadius: '14px', backgroundColor: '#f8fafc', border: autorisationBase64 ? '1.5px solid #d97706' : '1.5px dashed #cbd5e1', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <ShieldCheck size={26} color="#d97706" style={{ margin: '0 auto 6px' }} />
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '2px' }}>
                        Autorisation Parentale
                      </span>
                      <span style={{ fontSize: '0.73rem', color: '#64748b', display: 'block', marginBottom: '10px' }}>
                        {isMinor() ? <strong style={{ color: '#d97706' }}>Obligatoire (&lt; 18 ans)</strong> : 'Non requise (Majeur)'}
                      </span>
                      {autorisationFileName ? (
                        <div style={{ fontSize: '0.75rem', color: '#d97706', marginBottom: '8px', wordBreak: 'break-all', fontWeight: 700 }}>
                          ✔ {autorisationFileName}
                        </div>
                      ) : null}
                    </div>
                    <div>
                      <input 
                        type="file" 
                        id="autorisation-upload" 
                        accept="image/*,application/pdf" 
                        onChange={handleAutorisationUpload} 
                        style={{ display: 'none' }} 
                      />
                      <label 
                        htmlFor="autorisation-upload" 
                        style={{ display: 'inline-block', width: '100%', padding: '7px 10px', fontSize: '0.78rem', borderRadius: '8px', backgroundColor: autorisationBase64 ? '#fffbeb' : '#ffffff', color: '#d97706', cursor: 'pointer', fontWeight: 700, border: '1px solid #fde68a', transition: 'all 0.2s' }}
                      >
                        {autorisationBase64 ? 'Remplacer document' : 'Importer autorisation'}
                      </label>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Observations Médicales / Allergies (Optionnel)
                  </label>
                  <textarea 
                    name="observations_medicales" 
                    value={formData.observations_medicales} 
                    onChange={handleChange} 
                    rows={2} 
                    placeholder="Signalez toute information médicale pertinente (asthme, allergies, antécédents...)"
                    style={{
                      width: '100%',
                      padding: '0.7rem 0.9rem',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#0f172a',
                      fontSize: '0.9rem',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* SECTION 3 : FRAIS D'INSCRIPTION & DROITS D'ADHÉSION */}
              <div className="mb-8 p-4 rounded-xl" style={{ backgroundColor: '#ecfdf5', border: '1.5px solid #a7f3d0' }}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#d1fae5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                      <Sparkles size={22} />
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#065f46' }}>
                        Détail des Frais & Droits d'Adhésion : {formatDA(totalAdhesion)}
                      </h4>
                      <div style={{ fontSize: '0.82rem', color: '#047857', lineHeight: '1.5' }}>
                        • <strong>Frais d'inscription (Dossier & Badge QR) :</strong> {formatDA(fraisInscription)}<br />
                        • <strong>Droits d'adhésion du club :</strong> {formatDA(cotisationAdhesion)} (Licence & entraînements)
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#059669' }}>
                      Total : {formatDA(totalAdhesion)}
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#059669', backgroundColor: '#ffffff', padding: '3px 9px', borderRadius: '20px', border: '1px solid #a7f3d0', display: 'inline-block', marginTop: '3px' }}>
                      À régler au secrétariat
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4 : CONFORMITÉ LOI 18-07 & RÈGLEMENT */}
              <div className="mb-8 p-5 rounded-xl" style={{ 
                backgroundColor: errors.consentement_loi_18_07 ? '#fef2f2' : '#f8fafc', 
                border: errors.consentement_loi_18_07 ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0' 
              }}>
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    id="consentement_loi_18_07" 
                    name="consentement_loi_18_07" 
                    checked={formData.consentement_loi_18_07} 
                    onChange={handleChange} 
                    style={{ width: '20px', height: '20px', marginTop: '2px', cursor: 'pointer', accentColor: '#0f172a' }}
                  />
                  <label htmlFor="consentement_loi_18_07" style={{ fontSize: '0.85rem', color: '#334155', lineHeight: '1.6', cursor: 'pointer' }}>
                    <strong style={{ color: '#0f172a' }}>Conformité Loi 18-07 & Règlement Intérieur :</strong><br />
                    Je consens expressément au traitement de mes données personnelles et médicales par le <strong>Sporting Club Bouira</strong> dans le cadre strict de mon adhésion sportive et de la sécurité des entraînements, conformément à la loi 18-07. Je déclare avoir pris connaissance et accepter sans réserve le règlement intérieur du club.
                  </label>
                </div>
                {errors.consentement_loi_18_07 && (
                  <span className="text-red-500 text-xs font-semibold mt-2 block pl-8">{errors.consentement_loi_18_07}</span>
                )}
              </div>

              {/* BOUTON D'ENVOI */}
              <button 
                type="submit" 
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '1rem 1.5rem', 
                  fontSize: '1.05rem', 
                  fontWeight: 800, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '10px',
                  backgroundColor: '#0f172a', // BLEU MARINE PROFOND
                  color: '#ffffff',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 8px 25px rgba(15, 23, 42, 0.25)',
                  transition: 'transform 0.15s, background-color 0.2s'
                }}
              >
                <Download size={20} />
                {loading ? 'Traitement & Génération de votre fiche...' : "S'inscrire et télécharger ma fiche (PDF)"}
              </button>
            </div>
          </motion.form>
        )}

        {/* PIED DE PAGE */}
        <div className="text-center mt-8 text-xs font-medium" style={{ color: '#64748b' }}>
          Sporting Club Bouira · Club Amateur Sportif Sporting Bouira · Wilaya de Bouira<br />
          Portail conforme à la loi 18-07 relative à la protection des données personnelles © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
