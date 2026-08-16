/**
 * Générateur de Planche de Badges d'Accès (Format Carte Bancaire / CR80 : 85.6mm x 53.98mm)
 * Prêt à imprimer sur feuille A4 (4 ou 8 cartes par page avec repères de découpe pour plastification)
 */

import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { loadClubLogoBase64 } from './pdfHelpers';
import { getSwimmingCategory } from './swimmingCategories';
import { formatName } from './formatters';

/**
 * Génère et télécharge une planche PDF A4 de badges d'accès format carte de crédit (CR80)
 * @param {Array} athletesList - Liste des athlètes à inclure
 * @param {string} filename - Nom du fichier exporté
 */
export const generateBadgeSheetPDF = async (athletesList = [], filename = 'Planche_Badges_SCB.pdf') => {
  if (!athletesList || athletesList.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoBase64 = await loadClubLogoBase64();

  // Dimensions standards CR80
  const cardW = 85.6;
  const cardH = 53.98;
  const marginX = 14;
  const marginY = 16;
  const gapX = 10.8;
  const gapY = 12;
  const cols = 2;
  const rows = 4; // 8 cartes par feuille A4

  let currentCardIndex = 0;

  for (let i = 0; i < athletesList.length; i++) {
    const athlete = athletesList[i];
    const pageIndex = Math.floor(currentCardIndex / (cols * rows));
    const posOnPage = currentCardIndex % (cols * rows);

    if (posOnPage === 0 && currentCardIndex > 0) {
      doc.addPage();
    }

    const col = posOnPage % cols;
    const row = Math.floor(posOnPage / cols);

    const x = marginX + col * (cardW + gapX);
    const y = marginY + row * (cardH + gapY);

    // Repères de découpe (Crop marks)
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    // Coins
    doc.line(x - 3, y, x, y);
    doc.line(x, y - 3, x, y);
    doc.line(x + cardW, y - 3, x + cardW, y);
    doc.line(x + cardW, y, x + cardW + 3, y);
    doc.line(x - 3, y + cardH, x, y + cardH);
    doc.line(x, y + cardH, x, y + cardH + 3);
    doc.line(x + cardW, y + cardH + 3, x + cardW, y + cardH);
    doc.line(x + cardW, y + cardH, x + cardW + 3, y + cardH);

    // Fond de la carte
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(x, y, cardW, cardH, 3, 3, 'S');

    // Bandeau En-tête Navy Club
    doc.setFillColor(15, 23, 42); // #0f172a
    doc.roundedRect(x, y, cardW, 13.5, 3, 3, 'F');
    doc.setFillColor(15, 23, 42);
    doc.rect(x, y + 10, cardW, 3.5, 'F'); // Raccord rectangulaire bas

    // Ligne dorée/émeraude de séparation
    doc.setFillColor(16, 185, 129); // #10b981
    doc.rect(x, y + 13.5, cardW, 1, 'F');

    // Logo Club
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'JPEG', x + 2.5, y + 1.8, 9.5, 9.5);
      } catch (e) {
        console.warn('Logo card error:', e);
      }
    }

    // Titre Club dans l'en-tête
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('SPORTING CLUB BOUIRA', x + 14, y + 6.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(52, 211, 153);
    doc.text('CARTE D\'ACCÈS ATHLÈTE · SAISON 2025/2026', x + 14, y + 10.2);

    // Photo d'identité (ou placeholder)
    const photoX = x + 3.5;
    const photoY = y + 17;
    const photoW = 20;
    const photoH = 26;

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(photoX, photoY, photoW, photoH, 1.5, 1.5, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(photoX, photoY, photoW, photoH, 1.5, 1.5, 'S');

    const photoUrl = athlete.photo || athlete.photo_url;
    let photoAdded = false;

    if (photoUrl && photoUrl.startsWith('data:image')) {
      try {
        doc.addImage(photoUrl, 'JPEG', photoX, photoY, photoW, photoH);
        photoAdded = true;
      } catch {}
    }

    if (!photoAdded) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(148, 163, 184);
      doc.text((athlete.prenom?.[0] || 'A') + (athlete.nom?.[0] || 'T'), photoX + photoW / 2, photoY + photoH / 2 + 2, { align: 'center' });
    }

    // Informations Athlète (Centre)
    const infoX = x + 26.5;
    const nomComplet = formatName(athlete.nom, athlete.prenom);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(nomComplet, infoX, y + 21);

    // Catégorie Fédérale Natation (ex: Benjamins U13)
    const cat = getSwimmingCategory(athlete.date_naissance);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 58, 138); // Bleu foncé
    doc.text(`Catégorie : ${cat.label}`, infoX, y + 26);

    // Section / Groupe d'entraînement
    const groupeNom = athlete.groupes?.nom || athlete.groupe || 'Section Natation';
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Groupe : ${groupeNom}`, infoX, y + 30.5);

    // Validité / Expiration
    let validiteStr = 'À jour';
    if (athlete.cotisations && athlete.cotisations.length > 0) {
      const sorted = [...athlete.cotisations].sort((a, b) => new Date(b.periode_couverte_fin) - new Date(a.periode_couverte_fin));
      if (sorted[0]?.periode_couverte_fin) {
        validiteStr = `Valide jusqu'au : ${new Date(sorted[0].periode_couverte_fin).toLocaleDateString('fr-FR')}`;
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(16, 185, 129);
    doc.text(validiteStr, infoX, y + 35);

    // QR Code Vectoriel (Droite)
    const tokenQR = athlete.token_qr || athlete.id || `SCB-${Date.now()}`;
    const qrX = x + cardW - 22;
    const qrY = y + 17;
    const qrSize = 18.5;

    try {
      const qrDataUrl = await QRCode.toDataURL(tokenQR, {
        margin: 1,
        width: 150,
        color: { dark: '#0f172a', light: '#ffffff' }
      });
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
    } catch (qrErr) {
      console.warn('QR Code generation error:', qrErr);
    }

    // Pied de carte sécurisé
    doc.setFillColor(248, 250, 252);
    doc.rect(x, y + cardH - 8, cardW, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.line(x, y + cardH - 8, x + cardW, y + cardH - 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.2);
    doc.setTextColor(100, 116, 139);
    doc.text('Présentation obligatoire à chaque séance · Badge strictement personnel', x + cardW / 2, y + cardH - 3, { align: 'center' });

    currentCardIndex++;
  }

  doc.save(filename);
};
