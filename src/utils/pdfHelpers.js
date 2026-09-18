/**
 * Utilitaires partagés pour la génération de documents PDF officiels (jsPDF)
 */

let cachedLogoBase64 = null;

/**
 * Charge le logo du club (/logo.jpg) en Base64 avec mise en cache mémoire et protection anti-blocage (500ms max)
 * @returns {Promise<string|null>}
 */
export const loadClubLogoBase64 = () => {
  if (cachedLogoBase64) return Promise.resolve(cachedLogoBase64);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(null);
    }, 500);

    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 120;
          canvas.height = img.naturalHeight || 120;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataUri = canvas.toDataURL('image/jpeg', 0.9);
          cachedLogoBase64 = dataUri;
          resolve(dataUri);
        } catch (e) {
          console.warn('Canvas logo export error:', e);
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

/**
 * Génère le rapport financier mensuel en PDF (Clôture du mois)
 */
export const generateMonthlyReportPDF = async (stats, filterMonth, filterYear) => {
  const { jsPDF } = await import('jspdf');
  
  let logoBase64 = null;
  try {
    logoBase64 = await loadClubLogoBase64();
  } catch (e) {
    console.warn('Logo non chargé:', e);
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const monthName = filterMonth !== 'all' 
    ? new Date(2020, parseInt(filterMonth), 1).toLocaleString('fr-FR', { month: 'long' }).toUpperCase()
    : 'ANNUEL';
  const yearName = filterYear;

  // 1. BANDEAU HAUT
  doc.setFillColor(15, 23, 42); // Bleu Foncé
  doc.rect(0, 0, 210, 5, 'F');
  doc.setFillColor(16, 185, 129); // Vert
  doc.rect(0, 5, 210, 2, 'F');

  // 2. EN-TÊTE
  let headerTextX = 18;
  if (logoBase64) {
    doc.addImage(logoBase64, 'JPEG', 18, 12, 22, 22);
    headerTextX = 45;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42);
  doc.text('SPORTING CLUB BOUIRA', headerTextX, 18);
  doc.setFontSize(8.5);
  doc.setTextColor(16, 185, 129);
  doc.text('RAPPORT FINANCIER OFFICIEL', headerTextX, 23.5);

  // Bloc Période à droite
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(140, 11, 52, 24, 3, 3, 'F');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.roundedRect(140, 11, 52, 24, 3, 3, 'S');

  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text('PÉRIODE DE CLÔTURE', 166, 17, { align: 'center' });
  doc.setTextColor(16, 185, 129);
  doc.text(`${monthName} ${yearName}`, 166, 23, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Édité le ${new Date().toLocaleDateString('fr-FR')}`, 166, 29, { align: 'center' });

  // Ligne de séparation
  doc.setDrawColor(226, 232, 240);
  doc.line(18, 39, 192, 39);

  // 3. RÉSUMÉ FINANCIER GLOBAL
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(18, 44, 174, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("RÉSUMÉ DE TRÉSORERIE", 24, 49.5);

  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL DES ENCAISSEMENTS :", 24, 60);
  doc.setTextColor(16, 185, 129);
  doc.text(`${stats.totalRevenue.toLocaleString('fr-DZ')} DA`, 100, 60);

  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL DES DÉCAISSEMENTS :", 24, 68);
  doc.setTextColor(239, 68, 68);
  doc.text(`${stats.totalDepenses.toLocaleString('fr-DZ')} DA`, 100, 68);

  doc.setDrawColor(226, 232, 240);
  doc.line(24, 73, 150, 73);

  doc.setTextColor(15, 23, 42);
  doc.text("SOLDE NET (BÉNÉFICE) :", 24, 80);
  doc.setFontSize(14);
  doc.setTextColor(stats.beneficeNet >= 0 ? 16 : 239, stats.beneficeNet >= 0 ? 185 : 68, stats.beneficeNet >= 0 ? 129 : 68);
  doc.text(`${stats.beneficeNet.toLocaleString('fr-DZ')} DA`, 100, 80);

  // 4. VENTILATION DES ENCAISSEMENTS
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(18, 95, 174, 8, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("DÉTAIL DES ENCAISSEMENTS", 24, 100.5);

  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Frais de nouvelles inscriptions & badges :", 24, 110);
  doc.setTextColor(15, 23, 42);
  doc.text(`${stats.totalFraisInscription.toLocaleString('fr-DZ')} DA (${stats.countFraisInscription} opérations)`, 100, 110);

  doc.setTextColor(100, 116, 139);
  doc.text("Renouvellements de cotisations :", 24, 118);
  doc.setTextColor(15, 23, 42);
  doc.text(`${stats.totalCotisationsSportives.toLocaleString('fr-DZ')} DA (${stats.countCotisations} opérations)`, 100, 118);

  // 5. VENTILATION DES DÉPENSES
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(18, 130, 174, 8, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text("DÉTAIL DES DÉPENSES (PAR CATÉGORIE)", 24, 135.5);

  let y = 145;
  if (stats.depensesByCategory && stats.depensesByCategory.length > 0) {
    stats.depensesByCategory.forEach(cat => {
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(cat.name + " :", 24, y);
      doc.setTextColor(15, 23, 42);
      doc.text(`${cat.value.toLocaleString('fr-DZ')} DA`, 100, y);
      y += 8;
    });
  } else {
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Aucune dépense enregistrée sur cette période.", 24, y);
  }

  // 6. CACHET OFFICIEL
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(110, 200, 82, 40, 3, 3, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(110, 200, 82, 40, 3, 3, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("Le Bureau Exécutif (Trésorerie) :", 116, 207);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(148, 163, 184);
  doc.text("Approuvé et certifié exact.", 116, 211);

  // PIED DE PAGE
  doc.setDrawColor(226, 232, 240);
  doc.line(18, 275, 192, 275);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`Sporting Club Bouira · Rapport Financier Généré automatiquement le ${new Date().toLocaleDateString('fr-FR')}`, 105, 280, { align: 'center' });

  doc.save(`Rapport_Financier_SCB_${monthName}_${yearName}.pdf`);
};

