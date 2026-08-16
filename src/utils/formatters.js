/**
 * Utilitaires de formatage centralisés et optimisés
 */

/**
 * Formate un montant en Dinars Algériens (ex: 3 000 DA)
 * @param {number|string} val 
 * @returns {string}
 */
export const formatDA = (val) => {
  if (val === undefined || val === null || val === '') return '0 DA';
  const num = Math.round(Number(val));
  if (isNaN(num)) return '0 DA';
  const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} DA`;
};

export const formatDZ = formatDA;

/**
 * Formate le nom en MAJUSCULES et le prénom avec première lettre en majuscule
 * @param {string} nom 
 * @param {string} prenom 
 * @returns {string}
 */
export const formatName = (nom = '', prenom = '') => {
  const formattedNom = (nom || '').trim().toUpperCase();
  const formattedPrenom = (prenom || '').trim()
    .toLowerCase()
    .replace(/(?:^|\s|-)\S/g, (char) => char.toUpperCase());
  return `${formattedNom} ${formattedPrenom}`.trim() || 'Non renseigné';
};

/**
 * Calcule précisément l'âge à partir d'une date de naissance (YYYY-MM-DD)
 * @param {string|Date} dateNaissance 
 * @returns {number|null}
 */
export const calculateAge = (dateNaissance) => {
  if (!dateNaissance) return null;
  const birth = new Date(dateNaissance);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
};

/**
 * Masquage et formatage automatique d'un numéro de téléphone algérien (ex: 05 50 12 34 56)
 * @param {string} val 
 * @returns {string}
 */
export const formatPhoneInput = (val = '') => {
  const digits = val.replace(/\D/g, '').substring(0, 10);
  const parts = [];
  for (let i = 0; i < digits.length; i += 2) {
    parts.push(digits.substring(i, i + 2));
  }
  return parts.join(' ');
};

/**
 * Nettoie un numéro de téléphone pour lien WhatsApp international (+213)
 * @param {string} phone 
 * @returns {string}
 */
export const formatWhatsAppPhone = (phone = '') => {
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('0')) clean = '213' + clean.substring(1);
  return clean;
};
