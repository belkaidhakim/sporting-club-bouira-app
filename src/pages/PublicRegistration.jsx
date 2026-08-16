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

// Masquage et formatage automatique du téléphone (ex: 05 50 12 34 56)
const formatPhoneInput = (val = '') => {
  const digits = val.replace(/\D/g, '').substring(0, 10);
  const parts = [];
  for (let i = 0; i < digits.length; i += 2) {
    parts.push(digits.substring(i, i + 2));
  }
  return parts.join(' ');
};

const unformatPhone = (formatted = '') => {
  return formatted.replace(/\s+/g, '');
};

// Compression d'image côté client (Canvas)
const compressImageFile = (file, maxWidth = 1000, maxHeight = 1200, quality = 0.75) => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/')) {
      // S'il s'agit d'un PDF, lire directement en Data URL
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(null);
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
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
      doc.roundedRect(18, 118, 174, 28, 3, 3, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(18, 118, 174, 28, 3, 3, 'S');

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(18, 118, 174, 7, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("PIÈCES DU DOSSIER & INFORMATIONS MÉDICALES", 24, 123);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`• Certificat Médical : ${certificatBase64 ? 'Fourni en ligne' : 'Non fourni (À déposer au club)'}`, 24, 131);
      doc.text(`• Autorisation Parentale : ${isMinor() ? (autorisationBase64 ? 'Fournie en ligne' : 'Requise (À fournir au secrétariat)') : 'Non requise (Majeur)'}`, 24, 136);
      doc.text(`• Remarques / Allergies : ${data.observations_medicales || 'Aucune observation médicale particulière signalée.'}`, 24, 141);

      // SECTION 4 : FRAIS D'INSCRIPTION & DROITS D'ADHÉSION
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(18, 148, 174, 26, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.roundedRect(18, 148, 174, 26, 3, 3, 'S');

      doc.setFillColor(241, 245, 249);
      doc.roundedRect(18, 148, 174, 7, 3, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("FRAIS D'INSCRIPTION & DROITS D'ADHÉSION DU CLUB", 24, 153);

      // Détail 1 : Frais d'inscription
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("FRAIS D'INSCRIPTION (Dossier & Badge) :", 24, 159.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatDA(fraisInscription), 88, 159.5);

      // Détail 2 : Droits d'adhésion
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("DROITS D'ADHÉSION / CLUB :", 112, 159.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(formatDA(cotisationAdhesion), 166, 159.5);

      // Ligne Total
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(24, 163, 186, 163);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("TOTAL À RÉGLER :", 24, 169);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(16, 185, 129);
      doc.text(formatDA(totalAdhesion), 62, 169);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`(Frais Inscription : ${formatDA(fraisInscription)} + Droits d'Adhésion : ${formatDA(cotisationAdhesion)})`, 86, 169);

      // SECTION 5 : CONFORMITÉ LOI 18-07 & RÈGLEMENT
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(18, 178, 174, 22, 3, 3, 'F');
      doc.setDrawColor(134, 239, 172);
      doc.setLineWidth(0.5);
      doc.roundedRect(18, 178, 174, 22, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(21, 128, 61);
      doc.text("✔ CONFORMITÉ LÉGALE LOI 18-07 & RÈGLEMENT INTÉRIEUR", 24, 183.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.setTextColor(51, 65, 85);
      doc.text("Le candidat ou son représentant légal a consenti au traitement sécurisé de ses données personnelles et", 24, 188.5);
      doc.text("médicales par le Sporting Club Bouira, conformément à la loi 18-07, et a accepté le règlement intérieur.", 24, 192.5);

      // SECTION 6 : SIGNATURES & CACHET
      // Cadre Adhérent
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(18, 204, 82, 46, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.roundedRect(18, 204, 82, 46, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("Signature de l'adhérent / tuteur :", 24, 211);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text('(Mention "Lu et approuvé")', 24, 215);

      // Cadre Administration
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(110, 204, 82, 46, 3, 3, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(110, 204, 82, 46, 3, 3, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("Cadre réservé à l'Administration :", 116, 211);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text("SPORTING CLUB BOUIRA", 116, 216);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(16, 185, 129);
      doc.text("Secrétariat Général / Caisse", 116, 220);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Reçu : ${formatDA(totalAdhesion)} (${formatDA(fraisInscription)} + ${formatDA(cotisationAdhesion)})`, 116, 224);

      // PIED DE PAGE
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(18, 256, 192, 256);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Sporting Club Bouira · Fiche de pré-inscription générée le ${dateDemandeStr} à ${timeDemandeStr}`, 105, 261, { align: 'center' });
      doc.text("Veuillez vous présenter au secrétariat du club muni de cette fiche pour finaliser votre inscription et retirer votre badge.", 105, 265, { align: 'center' });

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
                    setAutorisationBase64(null);
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
                <div className="flex items-center gap-3 mb-6 pb-3 border-b border-[#e2e8f0]">
                  <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: '#ecfdf5', color: '#059669' }}>
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                      2. Téléchargement des Documents & Photo
                    </h3>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Les images sont automatiquement optimisées avant l'envoi</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Photo d'identité */}
                  <div style={{ padding: '1.25rem', borderRadius: '14px', backgroundColor: '#f8fafc', border: '1.5px dashed #cbd5e1', textAlign: 'center' }}>
                    <Camera size={26} color="#6366f1" style={{ margin: '0 auto 8px' }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                      Photo d'identité
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '12px' }}>
                      Pour le Badge QR officiel
                    </span>
                    {photoBase64 ? (
                      <div style={{ position: 'relative', width: '84px', height: '105px', margin: '0 auto 10px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #6366f1', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
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
                      style={{ display: 'inline-block', padding: '7px 14px', fontSize: '0.78rem', borderRadius: '8px', backgroundColor: '#eef2ff', color: '#6366f1', cursor: 'pointer', fontWeight: 700, border: '1px solid #c7d2fe' }}
                    >
                      {photoBase64 ? 'Changer la photo' : 'Sélectionner une photo'}
                    </label>
                  </div>

                  {/* Certificat Médical */}
                  <div style={{ padding: '1.25rem', borderRadius: '14px', backgroundColor: '#f8fafc', border: '1.5px dashed #cbd5e1', textAlign: 'center' }}>
                    <HeartPulse size={26} color="#059669" style={{ margin: '0 auto 8px' }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                      Certificat Médical
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '12px' }}>
                      Aptitude sportive (Photo ou scan)
                    </span>
                    {certificatFileName ? (
                      <div style={{ fontSize: '0.78rem', color: '#059669', marginBottom: '10px', wordBreak: 'break-all', fontWeight: 700 }}>
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
                      style={{ display: 'inline-block', padding: '7px 14px', fontSize: '0.78rem', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', cursor: 'pointer', fontWeight: 700, border: '1px solid #a7f3d0' }}
                    >
                      {certificatBase64 ? 'Remplacer le fichier' : 'Importer le certificat'}
                    </label>
                  </div>

                  {/* Autorisation Parentale */}
                  <div style={{ padding: '1.25rem', borderRadius: '14px', backgroundColor: '#f8fafc', border: '1.5px dashed #cbd5e1', textAlign: 'center' }}>
                    <ShieldCheck size={26} color="#d97706" style={{ margin: '0 auto 8px' }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0f172a', display: 'block', marginBottom: '4px' }}>
                      Autorisation Parentale
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '12px' }}>
                      {isMinor() ? <strong style={{ color: '#d97706' }}>Obligatoire (Moins de 18 ans)</strong> : 'Non requise pour majeurs'}
                    </span>
                    {autorisationFileName ? (
                      <div style={{ fontSize: '0.78rem', color: '#d97706', marginBottom: '10px', wordBreak: 'break-all', fontWeight: 700 }}>
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
                      style={{ display: 'inline-block', padding: '7px 14px', fontSize: '0.78rem', borderRadius: '8px', backgroundColor: '#fffbeb', color: '#d97706', cursor: 'pointer', fontWeight: 700, border: '1px solid #fde68a' }}
                    >
                      {autorisationBase64 ? 'Remplacer le document' : 'Importer l\'autorisation'}
                    </label>
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
