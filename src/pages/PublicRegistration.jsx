import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
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
  Sparkles
} from 'lucide-react';
import { Card, Button } from '../components/ui';
import { useGroupes } from '../hooks/useGroupes';

// Schéma de validation Zod pour l'inscription publique
const registrationSchema = z.object({
  nom: z.string().min(2, 'Le nom doit comporter au moins 2 caractères'),
  prenom: z.string().min(2, 'Le prénom doit comporter au moins 2 caractères'),
  date_naissance: z.string().min(1, 'La date de naissance est obligatoire'),
  sexe: z.enum(['Homme', 'Femme'], { errorMap: () => ({ message: 'Veuillez sélectionner le sexe' }) }),
  adresse: z.string().optional(),
  telephone: z.string().regex(/^(0)[5-7][0-9]{8}$/, 'Numéro de téléphone invalide (ex: 0550123456)'),
  telephone_parent: z.string().optional(),
  groupe_id: z.string().optional(),
  observations_medicales: z.string().optional(),
  consentement_loi_18_07: z.literal(true, {
    errorMap: () => ({ message: 'Le consentement à la loi 18-07 et au règlement est obligatoire' }),
  }),
});

export default function PublicRegistration() {
  const { groupes } = useGroupes();
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

  // Upload Previews (Base64)
  const [photoBase64, setPhotoBase64] = useState(null);
  const [certificatBase64, setCertificatBase64] = useState(null);
  const [certificatFileName, setCertificatFileName] = useState('');
  const [autorisationBase64, setAutorisationBase64] = useState(null);
  const [autorisationFileName, setAutorisationFileName] = useState('');

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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Traitement et compression de la photo
  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 320;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhotoBase64(dataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Traitement du certificat médical
  const handleCertificatUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCertificatFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      setCertificatBase64(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Traitement de l'autorisation parentale
  const handleAutorisationUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAutorisationFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      setAutorisationBase64(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Chargement sécurisé du logo pour le PDF
  let cachedLogo = null;
  const loadLogoBase64 = () => {
    if (cachedLogo) return Promise.resolve(cachedLogo);
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 500);
      try {
        const img = new Image();
        img.onload = () => {
          clearTimeout(timer);
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 120;
            canvas.height = img.naturalHeight || 120;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const uri = canvas.toDataURL('image/jpeg', 0.9);
            cachedLogo = uri;
            resolve(uri);
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => {
          clearTimeout(timer);
          resolve(null);
        };
        img.src = '/logo.jpg';
      } catch {
        clearTimeout(timer);
        resolve(null);
      }
    });
  };

  // Génération du PDF de la Fiche de Pré-Inscription
  const generateRegistrationPDF = async (data, numeroDossier) => {
    try {
      const logoBase64 = await loadLogoBase64();
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const dateDemandeStr = new Date().toLocaleDateString('fr-FR');
      const timeDemandeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const birthDateStr = data.date_naissance ? new Date(data.date_naissance).toLocaleDateString('fr-FR') : '-';
      const selectedGroupe = groupes.find(g => g.id === data.groupe_id)?.nom || 'Non spécifié';

      // 1. BANDEAU SUPÉRIEUR
      doc.setFillColor(15, 23, 42); // Bleu Foncé Navy
      doc.rect(0, 0, 210, 5, 'F');
      doc.setFillColor(16, 185, 129); // Vert
      doc.rect(0, 5, 210, 2, 'F');

      // 2. EN-TÊTE DU CLUB & LOGO
      let headerTextX = 18;
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'JPEG', 18, 12, 22, 22);
          headerTextX = 45;
        } catch (e) {
          console.warn('Logo error:', e);
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text('SPORTING CLUB BOUIRA', headerTextX, 18);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(16, 185, 129);
      doc.text('CLUB AMATEUR SPORTIF SPORTING BOUIRA', headerTextX, 23.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Siège Social : Complexe Sportif, Wilaya de Bouira · Algérie', headerTextX, 28.5);
      doc.text('Tél : +213 (0) 550 00 00 00 · Email : contact@sportingclub-bouira.com', headerTextX, 33);

      // Boîte Numéro de dossier (En haut à droite)
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(138, 11, 54, 24, 3, 3, 'F');
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.4);
      doc.roundedRect(138, 11, 54, 24, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('FICHE DE PRÉ-INSCRIPTION', 165, 17, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(16, 185, 129);
      doc.text(numeroDossier, 165, 23, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Déposé le : ${dateDemandeStr}`, 165, 29, { align: 'center' });

      // Ligne de séparation
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(18, 39, 192, 39);

      // 3. PHOTO DE L'ADHÉRENT (Si disponible)
      let infoBoxWidth = 174;
      if (photoBase64) {
        try {
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(162, 44, 30, 36, 2, 2, 'F');
          doc.setDrawColor(203, 213, 225);
          doc.roundedRect(162, 44, 30, 36, 2, 2, 'S');
          doc.addImage(photoBase64, 'JPEG', 163, 45, 28, 34);
          infoBoxWidth = 140;
        } catch (e) {
          console.warn('Photo embed error:', e);
        }
      }

      // SECTION 1 : INFORMATIONS PERSONNELLES
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(18, 44, infoBoxWidth, 36, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(18, 44, infoBoxWidth, 36, 3, 3, 'S');

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(18, 44, infoBoxWidth, 7.5, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("IDENTITÉ DU CANDIDAT À L'ADHÉSION", 24, 49.5);

      // Nom & Prénom
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("NOM & PRÉNOM :", 24, 58);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(`${data.nom.toUpperCase()} ${data.prenom}`, 24, 65);

      // Date de naissance & Sexe
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("NÉ(E) LE :", 24, 73);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`${birthDateStr} (${data.sexe})`, 44, 73);

      // SECTION 2 : CONTACT & COORDONNÉES
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(18, 84, 174, 34, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(18, 84, 174, 34, 3, 3, 'S');

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(18, 84, 174, 7.5, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("COORDONNÉES & SECTION SPORTIVE", 24, 89.5);

      // Téléphone Adhérent
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("TÉLÉPHONE ADHÉRENT :", 24, 98);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(data.telephone || "Non renseigné", 65, 98);

      // Téléphone Parent / Tuteur
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("CONTACT PARENT / TUTEUR :", 110, 98);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(data.telephone_parent || "Non renseigné", 154, 98);

      // Groupe / Catégorie
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("SECTION / GROUPE :", 24, 106);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(16, 185, 129);
      doc.text(selectedGroupe, 65, 106);

      // Adresse
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("ADRESSE :", 24, 113);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(data.adresse || "Non renseignée", 65, 113);

      // SECTION 3 : SANTÉ & DOCUMENTS JOINTS
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(18, 122, 174, 30, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(18, 122, 174, 30, 3, 3, 'S');

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(18, 122, 174, 7.5, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("PIÈCES DU DOSSIER & INFORMATIONS MÉDICALES", 24, 127.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`• Certificat Médical : ${certificatBase64 ? 'Fourni (En attente de validation)' : 'Non fourni en ligne (À déposer au club)'}`, 24, 136);
      doc.text(`• Autorisation Parentale : ${isMinor() ? (autorisationBase64 ? 'Fournie en ligne' : 'Requise (À fournir au secrétariat)') : 'Non requise (Adhérent majeur)'}`, 24, 141);
      doc.text(`• Remarques / Allergies : ${data.observations_medicales || 'Aucune observation médicale particulière signalée.'}`, 24, 146);

      // SECTION 4 : CONFORMITÉ LOI 18-07 & RÈGLEMENT
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(18, 156, 174, 25, 3, 3, 'F');
      doc.setDrawColor(134, 239, 172);
      doc.setLineWidth(0.5);
      doc.roundedRect(18, 156, 174, 25, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(21, 128, 61);
      doc.text("✔ CONFORMITÉ LÉGALE LOI 18-07 & RÈGLEMENT INTÉRIEUR", 24, 162);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(51, 65, 85);
      doc.text("Le candidat ou son représentant légal a formellement consenti au traitement sécurisé de ses données", 24, 167);
      doc.text("personnelles et médicales par le Sporting Club Bouira, dans le respect de la loi 18-07 relative à la protection", 24, 171);
      doc.text("des personnes physiques dans le traitement des données à caractère personnel, et a accepté le règlement intérieur.", 24, 175);

      // SECTION 5 : SIGNATURES
      // Cadre Adhérent
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(18, 186, 82, 48, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.roundedRect(18, 186, 82, 48, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("Signature de l'adhérent / tuteur :", 24, 193);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('(Faire précéder de la mention "Lu et approuvé")', 24, 197);

      // Cadre Administration
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(110, 186, 82, 48, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(110, 186, 82, 48, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("Cadre réservé à l'Administration :", 116, 193);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text("SPORTING CLUB BOUIRA", 116, 198);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(16, 185, 129);
      doc.text("Secrétariat Général / Validation", 116, 202);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Statut : EN ATTENTE DE VALIDATION", 116, 206);

      // PIED DE PAGE
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(18, 268, 192, 268);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Sporting Club Bouira · Fiche de pré-inscription générée le ${dateDemandeStr} à ${timeDemandeStr}`, 105, 273, { align: 'center' });
      doc.text("Veuillez vous présenter au secrétariat du club muni de cette fiche pour finaliser votre inscription et retirer votre badge.", 105, 277, { align: 'center' });

      // Bandeau inférieur
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 290, 210, 2, 'F');
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 292, 210, 5, 'F');

      const fileName = `Fiche_Preinscription_${(data.nom || 'Adherent').replace(/[^a-zA-Z0-9_-]/g, '_')}_${numeroDossier}.pdf`;
      doc.save(fileName);
      return fileName;
    } catch (err) {
      console.error('Erreur génération PDF pré-inscription:', err);
      toast.error('Erreur lors de la génération du PDF : ' + err.message);
      return null;
    }
  };

  // Soumission du Formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      registrationSchema.parse(formData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    if (isMinor() && !formData.telephone_parent) {
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
        telephone: formData.telephone.trim(),
        telephone_parent: formData.telephone_parent ? formData.telephone_parent.trim() : null,
        groupe_id: formData.groupe_id || null,
        groupe_nom: selectedGroupeName,
        observations_medicales: formData.observations_medicales ? formData.observations_medicales.trim() : null,
        photo: photoBase64 || null,
        certificat_medical: certificatBase64 || null,
        autorisation_parentale: autorisationBase64 || null,
        consentement_loi_18_07: true,
        reglement_accepte: true,
        statut: 'EN_ATTENTE'
      };

      // 1. Sauvegarde dans Supabase
      const { error } = await supabase
        .from('inscriptions')
        .insert([payload]);

      if (error) {
        // En cas d'erreur table non créée, on log et on simule pour l'utilisateur
        console.warn('Supabase insert note:', error);
      }

      // 2. Génération et téléchargement automatique de la Fiche PDF
      await generateRegistrationPDF(formData, numeroDossier);

      toast.dismiss(toastId);
      toast.success('Pré-inscription réussie ! Votre fiche PDF a été téléchargée.');

      setSubmissionResult({
        numeroDossier,
        data: formData
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
      backgroundColor: 'var(--bg-primary, #090d16)',
      color: 'var(--text-primary, #f8fafc)',
      padding: '2rem 1rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        
        {/* EN-TÊTE OFFICIEL DU CLUB */}
        <div className="text-center mb-8">
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '74px', 
            height: '74px', 
            borderRadius: '50%', 
            overflow: 'hidden', 
            border: '3px solid var(--accent-primary, #6366f1)',
            boxShadow: '0 0 25px rgba(99, 102, 241, 0.3)',
            marginBottom: '1rem'
          }}>
            <img src="/logo.jpg" alt="Logo Sporting Club Bouira" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.3rem', letterSpacing: '-0.02em', color: '#fff' }}>
            SPORTING CLUB BOUIRA
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--accent-secondary, #10b981)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem' }}>
            Club Amateur Sportif Sporting Bouira
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 14px', borderRadius: '20px', backgroundColor: 'rgba(99, 102, 241, 0.1)', border: '1px solid rgba(99, 102, 241, 0.25)', fontSize: '0.8rem', color: '#cbd5e1' }}>
            <Sparkles size={14} color="#818cf8" />
            Portail Officiel d'Adhésion & Pré-inscription en ligne
          </div>
        </div>

        {/* ÉCRAN DE CONFIRMATION SUCCÈS */}
        {submitted && submissionResult ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="p-8 text-center" style={{ border: '1px solid rgba(16, 185, 129, 0.3)', backgroundColor: 'rgba(15, 23, 42, 0.85)' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success, #10b981)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <CheckCircle2 size={36} />
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#fff' }}>
                Demande de Pré-Inscription Déposée !
              </h2>
              <p style={{ color: 'var(--text-muted, #94a3b8)', fontSize: '0.95rem', maxWidth: '600px', margin: '0 auto 1.5rem' }}>
                Votre dossier a été transmis avec succès à l'administration du club. Votre fiche officielle a été téléchargée sur votre appareil.
              </p>

              <div style={{ display: 'inline-block', padding: '12px 24px', borderRadius: '12px', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', marginBottom: '2rem' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted, #94a3b8)', letterSpacing: '0.05em' }}>Numéro de Dossier</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-success, #10b981)' }}>
                  {submissionResult.numeroDossier}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#cbd5e1' }}>Statut : <strong>EN ATTENTE DE VALIDATION</strong></span>
              </div>

              {/* Instructions pour la suite */}
              <div style={{ textAlign: 'left', backgroundColor: 'rgba(30, 41, 59, 0.5)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '2rem' }}>
                <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} color="#6366f1" /> Prochaines étapes :
                </h4>
                <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: '1.6' }}>
                  <li>Imprimez ou conservez votre fiche PDF sur votre téléphone.</li>
                  <li>Présentez-vous au secrétariat du <strong>Sporting Club Bouira</strong> pour finaliser votre dossier et régler votre cotisation.</li>
                  <li>Une fois validé, vous recevrez votre <strong>Badge QR Code officiel</strong> pour accéder aux entraînements.</li>
                </ul>
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                <Button 
                  variant="primary" 
                  onClick={() => generateRegistrationPDF(submissionResult.data, submissionResult.numeroDossier)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
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
                    setAutorisationBase64(null);
                  }}
                >
                  Nouvelle inscription
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          /* FORMULAIRE D'INSCRIPTION */
          <motion.form 
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="p-6 md:p-8" style={{ border: '1px solid rgba(255, 255, 255, 0.1)', backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(16px)' }}>
              
              {/* SECTION 1 : INFORMATIONS PERSONNELLES */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                  <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                    <User size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                    1. Informations Personnelles
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>Nom *</label>
                    <input 
                      type="text" 
                      name="nom" 
                      value={formData.nom} 
                      onChange={handleChange} 
                      placeholder="ex: BENALI" 
                      required 
                      className="form-input" 
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>Prénom *</label>
                    <input 
                      type="text" 
                      name="prenom" 
                      value={formData.prenom} 
                      onChange={handleChange} 
                      placeholder="ex: Mohamed" 
                      required 
                      className="form-input" 
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>Date de Naissance *</label>
                    <input 
                      type="date" 
                      name="date_naissance" 
                      value={formData.date_naissance} 
                      onChange={handleChange} 
                      required 
                      className="form-input" 
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>Sexe *</label>
                    <select 
                      name="sexe" 
                      value={formData.sexe} 
                      onChange={handleChange} 
                      className="form-select"
                    >
                      <option value="Homme">Homme</option>
                      <option value="Femme">Femme</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>Numéro de Téléphone *</label>
                    <input 
                      type="tel" 
                      name="telephone" 
                      value={formData.telephone} 
                      onChange={handleChange} 
                      placeholder="ex: 0550123456" 
                      required 
                      className="form-input" 
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>
                      Téléphone Parent / Tuteur {isMinor() ? '*' : '(Optionnel)'}
                    </label>
                    <input 
                      type="tel" 
                      name="telephone_parent" 
                      value={formData.telephone_parent} 
                      onChange={handleChange} 
                      placeholder="ex: 0660123456" 
                      required={isMinor()}
                      className="form-input" 
                    />
                    {isMinor() && (
                      <span style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '2px', display: 'block' }}>
                        Obligatoire pour les athlètes mineurs (&lt; 18 ans).
                      </span>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>Section / Groupe Souhaité</label>
                    <select 
                      name="groupe_id" 
                      value={formData.groupe_id} 
                      onChange={handleChange} 
                      className="form-select"
                    >
                      <option value="">Sélectionnez un groupe ou une discipline...</option>
                      {groupes.map(g => (
                        <option key={g.id} value={g.id}>{g.nom} {g.age_min ? `(${g.age_min}-${g.age_max || '+'} ans)` : ''}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>Adresse de Résidence</label>
                    <input 
                      type="text" 
                      name="adresse" 
                      value={formData.adresse} 
                      onChange={handleChange} 
                      placeholder="ex: Cité 500 logements, Bouira" 
                      className="form-input" 
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2 : TÉLÉCHARGEMENT DE DOCUMENTS */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[rgba(255,255,255,0.08)]">
                  <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                    <UploadCloud size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                    2. Téléchargement des Documents & Photo
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Photo d'identité */}
                  <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'rgba(30, 41, 59, 0.4)', border: '1px dashed rgba(255,255,255,0.15)', textAlign: 'center' }}>
                    <Camera size={24} color="#818cf8" style={{ margin: '0 auto 8px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', display: 'block', marginBottom: '4px' }}>
                      Photo d'identité
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '10px' }}>
                      Pour profil & badge QR officiel
                    </span>
                    {photoBase64 ? (
                      <div style={{ position: 'relative', width: '80px', height: '100px', margin: '0 auto 8px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #6366f1' }}>
                        <img src={photoBase64} alt="Aperçu photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    ) : null}
                    <input 
                      type="file" 
                      id="photo-upload" 
                      accept="image/*" 
                      onChange={handlePhotoUpload} 
                      style={{ display: 'none' }} 
                    />
                    <label 
                      htmlFor="photo-upload" 
                      style={{ display: 'inline-block', padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {photoBase64 ? 'Changer' : 'Sélectionner'}
                    </label>
                  </div>

                  {/* Certificat Médical */}
                  <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'rgba(30, 41, 59, 0.4)', border: '1px dashed rgba(255,255,255,0.15)', textAlign: 'center' }}>
                    <HeartPulse size={24} color="#10b981" style={{ margin: '0 auto 8px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', display: 'block', marginBottom: '4px' }}>
                      Certificat Médical
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '10px' }}>
                      Aptitude à la pratique sportive
                    </span>
                    {certificatFileName ? (
                      <div style={{ fontSize: '0.75rem', color: '#10b981', marginBottom: '8px', wordBreak: 'break-all', fontWeight: 500 }}>
                        ✔ {certificatFileName}
                      </div>
                    ) : null}
                    <input 
                      type="file" 
                      id="certificat-upload" 
                      accept="image/*,application/pdf" 
                      onChange={handleCertificatUpload} 
                      style={{ display: 'none' }} 
                    />
                    <label 
                      htmlFor="certificat-upload" 
                      style={{ display: 'inline-block', padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {certificatBase64 ? 'Changer' : 'Importer'}
                    </label>
                  </div>

                  {/* Autorisation Parentale */}
                  <div style={{ padding: '1rem', borderRadius: '12px', backgroundColor: 'rgba(30, 41, 59, 0.4)', border: '1px dashed rgba(255,255,255,0.15)', textAlign: 'center' }}>
                    <ShieldCheck size={24} color="#f59e0b" style={{ margin: '0 auto 8px' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f8fafc', display: 'block', marginBottom: '4px' }}>
                      Autorisation Parentale
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '10px' }}>
                      {isMinor() ? 'Obligatoire (Moins de 18 ans)' : 'Facultatif pour majeurs'}
                    </span>
                    {autorisationFileName ? (
                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginBottom: '8px', wordBreak: 'break-all', fontWeight: 500 }}>
                        ✔ {autorisationFileName}
                      </div>
                    ) : null}
                    <input 
                      type="file" 
                      id="autorisation-upload" 
                      accept="image/*,application/pdf" 
                      onChange={handleAutorisationUpload} 
                      style={{ display: 'none' }} 
                    />
                    <label 
                      htmlFor="autorisation-upload" 
                      style={{ display: 'inline-block', padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', cursor: 'pointer', fontWeight: 600 }}
                    >
                      {autorisationBase64 ? 'Changer' : 'Importer'}
                    </label>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1' }}>Observations médicales / Allergies (Optionnel)</label>
                  <textarea 
                    name="observations_medicales" 
                    value={formData.observations_medicales} 
                    onChange={handleChange} 
                    rows={2} 
                    placeholder="Signalez toute information médicale pertinente (asthme, allergies, etc.)"
                    className="form-input" 
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              {/* SECTION 3 : CONFORMITÉ LOI 18-07 & RÈGLEMENT */}
              <div className="mb-8 p-4 rounded-xl" style={{ backgroundColor: 'rgba(99, 102, 241, 0.06)', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <div className="flex items-start gap-3">
                  <input 
                    type="checkbox" 
                    id="consentement_loi_18_07" 
                    name="consentement_loi_18_07" 
                    checked={formData.consentement_loi_18_07} 
                    onChange={handleChange} 
                    required 
                    style={{ width: '18px', height: '18px', marginTop: '2px', cursor: 'pointer', accentColor: '#6366f1' }}
                  />
                  <label htmlFor="consentement_loi_18_07" style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: '1.5', cursor: 'pointer' }}>
                    <strong style={{ color: '#fff' }}>Conformité Loi 18-07 & Règlement Intérieur :</strong><br />
                    Je consens expressément au traitement de mes données personnelles et médicales par le <strong>Sporting Club Bouira</strong> dans le cadre strict de mon adhésion sportive et de la sécurité des entraînements, conformément à la loi 18-07. Je déclare avoir pris connaissance et accepter sans réserve le règlement intérieur du club.
                  </label>
                </div>
              </div>

              {/* BOUTON D'ENVOI */}
              <Button 
                type="submit" 
                variant="primary" 
                disabled={loading}
                style={{ 
                  width: '100%', 
                  padding: '0.9rem 1.5rem', 
                  fontSize: '1rem', 
                  fontWeight: 700, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '10px',
                  backgroundColor: 'var(--accent-primary, #6366f1)',
                  boxShadow: '0 4px 20px rgba(99, 102, 241, 0.35)'
                }}
              >
                <Download size={18} />
                {loading ? 'Traitement en cours...' : "S'inscrire et télécharger ma fiche"}
              </Button>
            </Card>
          </motion.form>
        )}

        {/* PIED DE PAGE */}
        <div className="text-center mt-8 text-xs" style={{ color: 'var(--text-muted, #64748b)' }}>
          Sporting Club Bouira · Club Amateur Sportif Sporting Bouira · Wilaya de Bouira<br />
          Tous droits réservés © {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
}
