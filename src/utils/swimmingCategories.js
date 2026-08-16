/**
 * Catégories officielles de natation (Fédération Algérienne de Natation / World Aquatics)
 * et détection intelligente des fratries / réductions familiales.
 */

import { calculateAge } from './formatters';

/**
 * Retourne la catégorie officielle de natation et les détails associés
 * @param {string|Date} dateNaissance 
 * @returns {{ code: string, label: string, age: number|null, color: string, badgeBg: string }}
 */
export const getSwimmingCategory = (dateNaissance) => {
  const age = calculateAge(dateNaissance);
  if (age === null) {
    return { code: 'NA', label: 'Non renseignée', age: null, color: '#94a3b8', badgeBg: 'rgba(148, 163, 184, 0.15)' };
  }

  if (age < 7) {
    return { code: 'U7', label: 'Baby Nat (U7)', age, color: '#ec4899', badgeBg: 'rgba(236, 72, 153, 0.15)' };
  } else if (age <= 9) {
    return { code: 'U9', label: 'Poussins / Avenirs (U9)', age, color: '#38bdf8', badgeBg: 'rgba(56, 189, 248, 0.15)' };
  } else if (age <= 11) {
    return { code: 'U11', label: 'Pupilles (U11)', age, color: '#818cf8', badgeBg: 'rgba(129, 140, 248, 0.15)' };
  } else if (age <= 13) {
    return { code: 'U13', label: 'Benjamins (U13)', age, color: '#34d399', badgeBg: 'rgba(52, 211, 153, 0.15)' };
  } else if (age <= 15) {
    return { code: 'U15', label: 'Minimes (U15)', age, color: '#fbbf24', badgeBg: 'rgba(251, 191, 36, 0.15)' };
  } else if (age <= 17) {
    return { code: 'U17', label: 'Cadets (U17)', age, color: '#fb923c', badgeBg: 'rgba(251, 146, 60, 0.15)' };
  } else if (age <= 19) {
    return { code: 'U20', label: 'Juniors (U20)', age, color: '#f43f5e', badgeBg: 'rgba(244, 63, 94, 0.15)' };
  } else if (age < 35) {
    return { code: 'SEN', label: 'Seniors (Élite)', age, color: '#a855f7', badgeBg: 'rgba(168, 85, 247, 0.15)' };
  } else {
    return { code: 'MAS', label: `Masters (+${age} ans)`, age, color: '#06b6d4', badgeBg: 'rgba(6, 182, 212, 0.15)' };
  }
};

/**
 * Détecte les fratries parmi une liste d'athlètes (même nom de famille ou même numéro de téléphone tuteur)
 * @param {Array} athletes 
 * @returns {Map<string, { familyId: string, count: number, members: Array, discountPercent: number }>}
 */
export const detectSiblingGroups = (athletes = []) => {
  const familyMap = new Map();

  athletes.forEach(athlete => {
    const nomClean = (athlete.nom || '').trim().toUpperCase();
    const phoneClean = (athlete.contact_urgence || athlete.telephone_tuteur || athlete.telephone || '').replace(/\D/g, '');
    
    if (!nomClean && !phoneClean) return;

    // Clé de regroupement familial
    const key = nomClean ? `NOM_${nomClean}` : `TEL_${phoneClean}`;

    if (!familyMap.has(key)) {
      familyMap.set(key, []);
    }
    familyMap.get(key).push(athlete);
  });

  const athleteFamilyInfo = new Map();

  familyMap.forEach((members, familyKey) => {
    if (members.length > 1) {
      // Trier par date d'inscription ou âge
      const sorted = [...members].sort((a, b) => new Date(a.date_naissance || 0) - new Date(b.date_naissance || 0));

      sorted.forEach((member, index) => {
        // Barème : 1er enfant = 0%, 2e = 10%, 3e et + = 20%
        let discountPercent = 0;
        if (index === 1) discountPercent = 10;
        else if (index >= 2) discountPercent = 20;

        athleteFamilyInfo.set(member.id, {
          familyKey,
          familyCount: members.length,
          siblingIndex: index + 1,
          discountPercent,
          siblings: members.filter(m => m.id !== member.id)
        });
      });
    }
  });

  return athleteFamilyInfo;
};

/**
 * Liste standard des épreuves officielles de natation en bassin
 */
export const SWIMMING_EVENTS = [
  { id: '50_NL', label: '50m Nage Libre', nage: 'Nage Libre', distance: 50 },
  { id: '100_NL', label: '100m Nage Libre', nage: 'Nage Libre', distance: 100 },
  { id: '200_NL', label: '200m Nage Libre', nage: 'Nage Libre', distance: 200 },
  { id: '400_NL', label: '400m Nage Libre', nage: 'Nage Libre', distance: 400 },
  { id: '50_DOS', label: '50m Dos', nage: 'Dos', distance: 50 },
  { id: '100_DOS', label: '100m Dos', nage: 'Dos', distance: 100 },
  { id: '50_BRASSE', label: '50m Brasse', nage: 'Brasse', distance: 50 },
  { id: '100_BRASSE', label: '100m Brasse', nage: 'Brasse', distance: 100 },
  { id: '50_PAP', label: '50m Papillon', nage: 'Papillon', distance: 50 },
  { id: '100_PAP', label: '100m Papillon', nage: 'Papillon', distance: 100 },
  { id: '100_4N', label: '100m 4 Nages', nage: '4 Nages', distance: 100 },
  { id: '200_4N', label: '200m 4 Nages', nage: '4 Nages', distance: 200 },
];
