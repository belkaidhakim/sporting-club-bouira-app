import jsPDF from 'jspdf';
import { loadClubLogoBase64 } from './pdfHelpers';
import { formatDA } from './formatters';

/**
 * Génère le Formulaire Officiel d'Inscription Tout-en-Un du Sporting Club Bouira
 * Regroupe :
 * 1. Informations de l'adhérent
 * 2. Emplacement Photo d'identité (ou photo intégrée)
 * 3. Volet Certificat Médical d'Aptitude sportive (à remplir/signer par le médecin)
 * 4. Volet Autorisation Parentale (pour les mineurs)
 * 5. Engagement & Conformité Loi 18-07
 * 6. Cadre Administration & Reçu de Caisse
 * 
 * @param {Object} options
 * @param {Object} [options.data] - Données de l'adhérent (nom, prenom, date_naissance, etc.)
 * @param {string} [options.numeroDossier] - Numéro de dossier généré (ex: SCB-PRE-123456)
 * @param {string|null} [options.photoBase64] - Photo de l'adhérent en Base64
 * @param {boolean} [options.isBlank] - Si true, génère un formulaire vierge à remplir à la main
 * @param {number} [options.fraisInscription] - Montant frais de dossier (défaut 1000 DA)
 * @param {number} [options.cotisationAdhesion] - Montant adhésion (défaut 2000 DA)
 * @returns {Promise<string|null>} Nom du fichier téléchargé
 */
export async function generateOfficialRegistrationFormPdf({
  data = {},
  numeroDossier = null,
  photoBase64 = null,
  isBlank = false,
  fraisInscription = 1000,
  cotisationAdhesion = 2000,
  selectedGroupeNom = null
} = {}) {
  try {
    const logoBase64 = await loadClubLogoBase64();
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const totalAdhesion = Number(fraisInscription || 0) + Number(cotisationAdhesion || 0);
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const dossierNumber = isBlank 
      ? 'DOSSIER VIERGE' 
      : (numeroDossier || `SCB-${Date.now().toString().slice(-6)}`);

    const birthDateStr = (!isBlank && data.date_naissance) 
      ? new Date(data.date_naissance).toLocaleDateString('fr-FR') 
      : null;

    let ageStr = '';
    if (!isBlank && data.date_naissance) {
      const birth = new Date(data.date_naissance);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age >= 0) ageStr = `${age} ans ${age < 18 ? '(Mineur)' : '(Majeur)'}`;
    }

    const groupeName = isBlank 
      ? null 
      : (selectedGroupeNom || data.groupe_nom || data.groupes?.nom || 'Section Natation / Multisports');

    // ==========================================
    // 1. BANDEAUX SUPÉRIEURS
    // ==========================================
    doc.setFillColor(15, 23, 42); // Bleu Marine Navy (#0f172a)
    doc.rect(0, 0, 210, 4.5, 'F');
    doc.setFillColor(16, 185, 129); // Vert Emeraude (#10b981)
    doc.rect(0, 4.5, 210, 1.5, 'F');

    // ==========================================
    // 2. EN-TÊTE DU CLUB & LOGO (y=8 à 30mm)
    // ==========================================
    let headerTextX = 15;
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'JPEG', 15, 8.5, 20, 20);
        headerTextX = 39;
      } catch (e) {
        console.warn('Logo embed error:', e);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('SPORTING CLUB BOUIRA', headerTextX, 14.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text('CLUB SPORTIF AMATEUR · SECTION NATATION & ACTIVITÉS SPORTIVES', headerTextX, 19.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(100, 116, 139);
    doc.text('Complexe Sportif, Wilaya de Bouira · Tél : +213 (0) 550 00 00 00', headerTextX, 24);
    doc.text('Email : contact@sportingclub-bouira.com · Site : sportingclub-bouira.com', headerTextX, 27.5);

    // Boîte Numéro de Dossier / Titre Fiche (Haut Droite)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(138, 8, 57, 21, 2.5, 2.5, 'F');
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.roundedRect(138, 8, 57, 21, 2.5, 2.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("FICHE D'INSCRIPTION & DOSSIER MÉDICAL", 166.5, 13.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(5, 150, 105);
    doc.text(dossierNumber, 166.5, 19.5, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Édité le : ${dateStr}`, 166.5, 25, { align: 'center' });

    // Ligne séparatrice
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(15, 31, 195, 31);

    // ==========================================
    // 3. SECTION 1 : IDENTITÉ ADHÉRENT & PHOTO (y=33 à 69mm)
    // ==========================================
    const s1Y = 33;
    const s1H = 37;
    const infoW = 145;

    // Bloc Infos Adhérent
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, s1Y, infoW, s1H, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(15, s1Y, infoW, s1H, 2, 2, 'S');

    // Titre section 1
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, s1Y, infoW, 6.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("1. IDENTITÉ DU CANDIDAT & DISCIPLINE SPORTIVE", 20, s1Y + 4.8);

    // Champs Adhérent
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("NOM & PRÉNOM :", 20, s1Y + 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(
      (!isBlank && data.nom) ? `${data.nom.toUpperCase()} ${data.prenom || ''}` : '....................................................................................',
      47, s1Y + 12
    );

    // Ligne 2 : Date de naissance & Sexe & Âge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("NÉ(E) LE :", 20, s1Y + 19);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(birthDateStr || '...... / ...... / ............', 37, s1Y + 19);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("SEXE :", 75, s1Y + 19);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text((!isBlank && data.sexe) ? data.sexe : '[  ] Masc.   [  ] Fém.', 87, s1Y + 19);

    if (ageStr) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(5, 150, 105);
      doc.text(`Âge : ${ageStr}`, 120, s1Y + 19);
    }

    // Ligne 3 : Groupe & Adresse
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("SECTION / GROUPE :", 20, s1Y + 26);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(5, 150, 105);
    doc.text(groupeName || '..................................................................', 51, s1Y + 26);

    // Ligne 4 : Téléphones
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("TÉL. ADHÉRENT :", 20, s1Y + 33);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text((!isBlank && data.telephone) ? data.telephone : '................................', 47, s1Y + 33);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("CONTACT PARENT :", 84, s1Y + 33);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text((!isBlank && data.telephone_parent) ? data.telephone_parent : '................................', 113, s1Y + 33);

    // Bloc Photo (À droite)
    const photoX = 163;
    const photoY = s1Y;
    const photoW = 32;
    const photoH = s1H;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(photoX, photoY, photoW, photoH, 2, 2, 'S');

    if (photoBase64) {
      try {
        doc.addImage(photoBase64, 'JPEG', photoX + 2, photoY + 2, photoW - 4, photoH - 4);
      } catch (e) {
        console.warn('Photo render error:', e);
      }
    } else {
      doc.setDrawColor(148, 163, 184);
      doc.setLineDashPattern([1, 1], 0);
      doc.roundedRect(photoX + 2.5, photoY + 2.5, photoW - 5, photoH - 5, 1.5, 1.5, 'S');
      doc.setLineDashPattern([], 0); // Reset dash

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      doc.text('PHOTO', photoX + photoW / 2, photoY + 15, { align: 'center' });
      doc.text("D'IDENTITÉ", photoX + photoW / 2, photoY + 18.5, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.text('(Coller ici)', photoX + photoW / 2, photoY + 23, { align: 'center' });
    }

    // ==========================================
    // 4. SECTION 2 : CERTIFICAT MÉDICAL D'APTITUDE (y=72 à 118mm)
    // ==========================================
    const s2Y = 72;
    const s2H = 46;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, s2Y, 180, s2H, 2, 2, 'F');
    doc.setDrawColor(16, 185, 129); // Bordure verte santé
    doc.setLineWidth(0.4);
    doc.roundedRect(15, s2Y, 180, s2H, 2, 2, 'S');

    doc.setFillColor(236, 253, 245); // Vert très clair
    doc.roundedRect(15, s2Y, 180, 6.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(6, 95, 70);
    doc.text("2. CERTIFICAT MÉDICAL D'APTITUDE SPORTIVE (Cadre réservé au Médecin)", 20, s2Y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.setTextColor(30, 41, 59);
    doc.text("Je soussigné(e), Docteur en médecine : .......................................................................................................................................", 20, s2Y + 12);
    doc.text("Certifie avoir examiné ce jour l'athlète susmentionné et n'avoir constaté à ce jour aucune contre-indication clinique", 20, s2Y + 17.5);
    doc.text("à la pratique des activités physiques et sportives au sein du Sporting Club Bouira (Natation / Natation de compétition).", 20, s2Y + 22.5);

    const obsText = (!isBlank && data.observations_medicales) 
      ? data.observations_medicales 
      : 'Néant / R.A.S ...........................................................................................................................................';
    doc.text(`Observations / Allergies / Antécédents : ${obsText}`, 20, s2Y + 27.5);

    // Sous-cadre Date & Cachet médecin
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text("Fait à : ............................................... le : ...... / ...... / 202...", 20, s2Y + 37);

    // Boîte Cachet & Signature Médecin
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(118, s2Y + 29.5, 72, 14.5, 1.5, 1.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(118, s2Y + 29.5, 72, 14.5, 1.5, 1.5, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Cachet et Signature du Médecin", 154, s2Y + 34, { align: 'center' });

    // ==========================================
    // 5. SECTION 3 : AUTORISATION PARENTALE (y=120 à 158mm)
    // ==========================================
    const s3Y = 120;
    const s3H = 38;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, s3Y, 180, s3H, 2, 2, 'F');
    doc.setDrawColor(217, 119, 6); // Bordure ambre parentale
    doc.setLineWidth(0.4);
    doc.roundedRect(15, s3Y, 180, s3H, 2, 2, 'S');

    doc.setFillColor(254, 243, 199); // Jaune ambre très clair
    doc.roundedRect(15, s3Y, 180, 6.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14);
    doc.text("3. AUTORISATION PARENTALE (Obligatoire pour les mineurs de moins de 18 ans)", 20, s3Y + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    doc.text("Je soussigné(e) M. / Mme : ............................................................................ Qualité : [  ] Père   [  ] Mère   [  ] Tuteur légal", 20, s3Y + 12);
    doc.text("Autorise mon enfant mineur désigné ci-dessus à adhérer au Sporting Club Bouira et à participer régulièrement", 20, s3Y + 17);
    doc.text("aux séances d'entraînement et compétitions. En cas d'urgence, j'autorise les encadrants à prendre toute mesure médicale utile.", 20, s3Y + 21.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text("Fait à : ............................................... le : ...... / ...... / 202...", 20, s3Y + 31);

    // Boîte Signature Parent
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(118, s3Y + 24.5, 72, 11.5, 1.5, 1.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(118, s3Y + 24.5, 72, 11.5, 1.5, 1.5, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Signature du Parent / Représentant Légal", 154, s3Y + 29, { align: 'center' });

    // ==========================================
    // 6. SECTION 4 : ENGAGEMENT LOI 18-07 & RÈGLEMENT (y=160 à 193mm)
    // ==========================================
    const s4Y = 160;
    const s4H = 33;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, s4Y, 180, s4H, 2, 2, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(15, s4Y, 180, s4H, 2, 2, 'S');

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(15, s4Y, 180, 6, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text("4. ENGAGEMENT DE L'ADHÉRENT & CONFORMITÉ LOI 18-07", 20, s4Y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.6);
    doc.setTextColor(51, 65, 85);
    doc.text("Le candidat ou son représentant légal déclare avoir pris connaissance du règlement intérieur du Sporting Club Bouira", 20, s4Y + 10.5);
    doc.text("et s'engage à en respecter les statuts et règles de sécurité. Conformément à la loi 18-07 relative à la protection des données", 20, s4Y + 14.5);
    doc.text("à caractère personnel, les informations collectées sont strictement confidentielles et réservées à la gestion sportive.", 20, s4Y + 18.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Mention manuscrite "Lu et approuvé" :', 20, s4Y + 27);

    // Boîte Signature Adhérent
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(118, s4Y + 21, 72, 10.5, 1.5, 1.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(118, s4Y + 21, 72, 10.5, 1.5, 1.5, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Signature de l'Adhérent (ou Tuteur)", 154, s4Y + 25.5, { align: 'center' });

    // ==========================================
    // 7. SECTION 5 : CADRE ADMINISTRATION & REÇU DE CAISSE (y=195 à 243mm)
    // ==========================================
    const s5Y = 195;
    const s5H = 46;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, s5Y, 180, s5H, 2, 2, 'F');
    doc.setDrawColor(15, 23, 42); // Bordure bleu foncé officiel
    doc.setLineWidth(0.4);
    doc.roundedRect(15, s5Y, 180, s5H, 2, 2, 'S');

    doc.setFillColor(15, 23, 42); // Bandeau bleu nuit
    doc.roundedRect(15, s5Y, 180, 6.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("5. CADRE RÉSERVÉ À L'ADMINISTRATION & CAISSE DU CLUB (Pièces & Règlement)", 20, s5Y + 4.8);

    // Colonne Gauche : Pièces fournies & Frais
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text("PIÈCES DU DOSSIER REÇUES :", 20, s5Y + 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text("[  ] Photo d'identité   [  ] Certificat médical   [  ] Extrait de naissance   [  ] Autorisation parentale", 20, s5Y + 17);

    // Frais & Paiement
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text("DÉTAIL FINANCIER :", 20, s5Y + 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text(`• Frais de dossier & Badge QR : ${formatDA(fraisInscription)}`, 20, s5Y + 29);
    doc.text(`• Droits d'adhésion & Licence : ${formatDA(cotisationAdhesion)}`, 20, s5Y + 34);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`TOTAL À ENCAISSER : ${formatDA(totalAdhesion)}`, 20, s5Y + 40);

    // Colonne Droite : Cachet Club & Visa Secrétariat
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(118, s5Y + 8.5, 72, 35, 1.5, 1.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(118, s5Y + 8.5, 72, 35, 1.5, 1.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text("SPORTING CLUB BOUIRA", 154, s5Y + 14, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Secrétariat Général / Caisse", 154, s5Y + 18.5, { align: 'center' });
    doc.text("Reçu le : ...... / ...... / 202...", 154, s5Y + 23.5, { align: 'center' });
    doc.text("Badge QR Activé : [  ] OUI   [  ] NON", 154, s5Y + 28, { align: 'center' });
    doc.text("Cachet et Signature de l'Agent :", 154, s5Y + 33, { align: 'center' });

    // ==========================================
    // 8. PIED DE PAGE & BANDEAUX INFÉRIEURS (y=245 à 297mm)
    // ==========================================
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(15, 280, 195, 280);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Sporting Club Bouira · Club Amateur Sportif · Formulaire officiel tout-en-un conforme à la loi 18-07", 105, 285, { align: 'center' });
    doc.text("Ce document complet est à déposer au secrétariat du club pour finaliser l'adhésion et retirer la carte d'accès.", 105, 289, { align: 'center' });

    doc.setFillColor(16, 185, 129);
    doc.rect(0, 292, 210, 1.5, 'F');
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 293.5, 210, 3.5, 'F');

    const fileName = isBlank
      ? `Formulaire_Inscription_Vierge_Sporting_Club_Bouira.pdf`
      : `Dossier_Inscription_${(data.nom || 'Adherent').replace(/[^a-zA-Z0-9_-]/g, '_')}_${dossierNumber}.pdf`;

    doc.save(fileName);
    return fileName;
  } catch (err) {
    console.error('Erreur génération formulaire inscription tout-en-un:', err);
    throw err;
  }
}
