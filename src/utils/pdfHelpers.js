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
