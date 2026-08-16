/**
 * Utilitaire de compression d'images côté client via Canvas
 * Optimisé pour réduire les quotas de bande passante et le stockage Base64
 */

/**
 * Compresse et redimensionne un fichier image en JPEG Base64
 * @param {File} file - Le fichier image
 * @param {number} maxWidth - Largeur maximale en pixels (défaut 800)
 * @param {number} maxHeight - Hauteur maximale en pixels (défaut 1000)
 * @param {number} quality - Qualité JPEG entre 0.1 et 1.0 (défaut 0.7)
 * @returns {Promise<string|null>}
 */
export const compressImageFile = (file, maxWidth = 800, maxHeight = 1000, quality = 0.7) => {
  return new Promise((resolve) => {
    if (!file || !file.type.startsWith('image/')) {
      // Si ce n'est pas une image (ex: PDF), lire en Base64 standard
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
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          // Calcul du ratio de redimensionnement
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

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          // Lissage et rendu de haute qualité
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Export en JPEG optimisé
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        } catch (err) {
          console.warn('Fallback lecture Base64:', err);
          resolve(event.target.result);
        }
      };
      img.onerror = () => resolve(null);
      img.src = event.target.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};
