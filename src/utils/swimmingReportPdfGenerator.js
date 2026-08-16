/**
 * Générateur de Fiche Bilan de Progression & Performances en Natation (Format PDF A4)
 * Prêt à imprimer et à remettre aux parents ou athlètes du Sporting Club Bouira
 */

import jsPDF from 'jspdf';
import { loadClubLogoBase64 } from './pdfHelpers';
import { getSwimmingCategory, SWIMMING_EVENTS } from './swimmingCategories';
import { formatName } from './formatters';

export const generateSwimmingReportPDF = async (athlete, performances = []) => {
  if (!athlete) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoBase64 = await loadClubLogoBase64();
  const category = getSwimmingCategory(athlete.date_naissance);
  const athleteFullName = formatName(athlete.nom, athlete.prenom);
  const athleteGroupe = athlete.groupes?.nom || athlete.groupe || 'Section Natation';
  const birthStr = athlete.date_naissance ? new Date(athlete.date_naissance).toLocaleDateString('fr-FR') : '-';

  // 1. BANDEAU HAUT
  doc.setFillColor(15, 23, 42); // Navy
  doc.rect(0, 0, 210, 5, 'F');
  doc.setFillColor(16, 185, 129); // Emerald
  doc.rect(0, 5, 210, 2, 'F');

  // 2. EN-TÊTE
  let headerTextX = 16;
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', 16, 12, 20, 20);
      headerTextX = 40;
    } catch (e) {
      console.warn('Logo error:', e);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('SPORTING CLUB BOUIRA', headerTextX, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(16, 185, 129);
  doc.text('SECTION NATATION COURSE · SUIVI DE LA PROGRESSION', headerTextX, 23.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Complexe Sportif, Wilaya de Bouira · Tél: +213 (0) 550 00 00 00', headerTextX, 28.5);

  // Boîte Document
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(140, 11, 54, 22, 3, 3, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.roundedRect(140, 11, 54, 22, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('BILAN DE PERFORMANCE', 167, 17, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Édité le : ${new Date().toLocaleDateString('fr-FR')}`, 167, 23, { align: 'center' });
  doc.text(`Saison 2025/2026`, 167, 28, { align: 'center' });

  // Ligne de séparation
  doc.setDrawColor(226, 232, 240);
  doc.line(16, 36, 194, 36);

  // 3. FICHE ATHLÈTE
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(16, 40, 178, 26, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(16, 40, 178, 26, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Nageur(se) : ${athleteFullName}`, 22, 47);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Date de naissance : ${birthStr} (${category.age !== null ? category.age + ' ans' : '-'})`, 22, 53);
  doc.text(`Groupe d'entraînement : ${athleteGroupe}`, 22, 59);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 58, 138);
  doc.text(`Catégorie Fédérale (FAN) : ${category.label}`, 110, 47);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Total chronos enregistrés : ${performances.length}`, 110, 53);

  // 4. TABLEAU DES RECORDS PERSONNELS (PB - Personal Bests)
  let currentY = 74;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('🏆 Records Personnels par Épreuve (Personal Bests)', 16, currentY);

  currentY += 4;
  // En-tête tableau PB
  doc.setFillColor(15, 23, 42);
  doc.rect(16, currentY, 178, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Épreuve', 20, currentY + 4.8);
  doc.text('Meilleur Temps', 75, currentY + 4.8);
  doc.text('Bassin', 110, currentY + 4.8);
  doc.text('Date du Record', 135, currentY + 4.8);
  doc.text('Contexte', 165, currentY + 4.8);

  currentY += 7;

  // Calculer les PB par épreuve
  const pbMap = new Map();
  performances.forEach(p => {
    if (!pbMap.has(p.event_id) || p.seconds < pbMap.get(p.event_id).seconds) {
      pbMap.set(p.event_id, p);
    }
  });

  const pbList = Array.from(pbMap.values()).sort((a, b) => a.event_label.localeCompare(b.event_label));

  if (pbList.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(16, currentY, 178, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(16, currentY, 178, 8, 'S');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Aucun temps officiel enregistré pour le moment.', 20, currentY + 5.5);
    currentY += 12;
  } else {
    pbList.slice(0, 8).forEach((pb, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(16, currentY, 178, 6.5, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(16, currentY, 178, 6.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(pb.event_label, 20, currentY + 4.5);

      doc.setTextColor(16, 185, 129); // Vert
      doc.text(pb.chrono_str, 75, currentY + 4.5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(pb.bassin || '25m', 110, currentY + 4.5);
      doc.text(new Date(pb.date_perf).toLocaleDateString('fr-FR'), 135, currentY + 4.5);
      doc.text(pb.contexte || 'Entraînement', 165, currentY + 4.5);

      currentY += 6.5;
    });
    currentY += 6;
  }

  // 5. HISTORIQUE DÉTAILLÉ RÉCENT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('📊 Historique Récent des Passages & Séances Chronométrées', 16, currentY);

  currentY += 4;
  doc.setFillColor(241, 245, 249);
  doc.rect(16, currentY, 178, 7, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.setTextColor(71, 85, 105);
  doc.text('Date', 20, currentY + 4.8);
  doc.text('Épreuve', 45, currentY + 4.8);
  doc.text('Temps', 85, currentY + 4.8);
  doc.text('Passage 50m', 110, currentY + 4.8);
  doc.text('Sensation (RPE)', 140, currentY + 4.8);
  doc.text('Notes / Observations', 165, currentY + 4.8);

  currentY += 7;

  const recentList = [...performances].sort((a, b) => new Date(b.date_perf) - new Date(a.date_perf)).slice(0, 10);

  if (recentList.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(16, currentY, 178, 8, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(16, currentY, 178, 8, 'S');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Aucun passage récent.', 20, currentY + 5.5);
    currentY += 12;
  } else {
    recentList.forEach((p, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.rect(16, currentY, 178, 6.2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(16, currentY, 178, 6.2, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      doc.text(new Date(p.date_perf).toLocaleDateString('fr-FR'), 20, currentY + 4.3);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(p.event_label, 45, currentY + 4.3);
      doc.text(p.chrono_str, 85, currentY + 4.3);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(p.split_50 || '-', 110, currentY + 4.3);
      doc.text(p.rpe ? `${p.rpe}/10` : '-', 140, currentY + 4.3);
      doc.text((p.observations || '-').substring(0, 18), 165, currentY + 4.3);

      currentY += 6.2;
    });
    currentY += 8;
  }

  // 6. APPRÉCIATION DE L'ENTRAÎNEUR & SIGNATURE
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(16, 245, 178, 38, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(16, 245, 178, 38, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Appréciation Générale de l'Entraîneur :", 22, 252);

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Très bon engagement lors des séances. Progression constante sur la technique et les virages.", 22, 259);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Le Staff Technique", 30, 275);
  doc.text("Direction du Club (Cachet)", 130, 275);

  doc.save(`Bilan_Natation_${athlete.nom}_${athlete.prenom}.pdf`);
};
