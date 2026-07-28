/**
 * Converts any Image File or Blob to WebP format in the browser.
 * 
 * @param {File|Blob} fileOrBlob - Input image file (PNG, JPG, JPEG, GIF, HEIC, etc.)
 * @param {Object} options - Conversion options
 * @param {number} [options.quality=0.85] - Quality scale between 0.1 and 1.0
 * @param {number} [options.maxWidth=2048] - Max width constraint (optional)
 * @param {number} [options.maxHeight=2048] - Max height constraint (optional)
 * @returns {Promise<File>} Converted WebP file
 */
export async function convertToWebP(fileOrBlob, options = {}) {
  if (!fileOrBlob || !(fileOrBlob instanceof Blob)) {
    throw new Error('Valid File or Blob object is required for WebP conversion.');
  }

  const quality = typeof options.quality === 'number' ? options.quality : 0.85;
  const maxWidth = options.maxWidth || 2048;
  const maxHeight = options.maxHeight || 2048;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        try {
          let { width, height } = img;

          // Scale down if larger than max dimensions while maintaining aspect ratio
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            return reject(new Error('Failed to get 2D canvas context'));
          }

          // Fill white background for transparent PNGs converting to lossy WebP if needed
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                return reject(new Error('WebP canvas conversion returned empty blob'));
              }

              // Derive new filename
              const originalName = fileOrBlob.name || 'image.jpg';
              const nameWithoutExt = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
              const webpFileName = `${nameWithoutExt}.webp`;

              const webpFile = new File([blob], webpFileName, {
                type: 'image/webp',
                lastModified: Date.now(),
              });

              resolve(webpFile);
            },
            'image/webp',
            quality
          );
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = (err) => {
        reject(new Error('Failed to load image for WebP conversion'));
      };

      img.src = event.target.result;
    };

    reader.onerror = (err) => {
      reject(new Error('Failed to read image file'));
    };

    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Converts array of Files to WebP format.
 * 
 * @param {Array<File|Blob>} files 
 * @param {Object} options 
 * @returns {Promise<Array<File>>}
 */
export async function convertMultipleToWebP(files = [], options = {}) {
  if (!Array.isArray(files) || files.length === 0) return [];

  return Promise.all(
    files.map(async (file) => {
      if (file && file.type && file.type.startsWith('image/')) {
        try {
          return await convertToWebP(file, options);
        } catch (err) {
          console.warn('Failed to convert file to WebP, falling back to original:', file.name, err);
          return file;
        }
      }
      return file;
    })
  );
}
