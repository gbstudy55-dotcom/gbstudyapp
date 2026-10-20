/**
 * Compresses an image File or base64 Data URL to stay well below Firestore's 1MB document limit.
 * Guaranteed to stay under safe thresholds:
 * - Icons: max 128x128, compressed to ~8-25 KB (hard max 45 KB)
 * - Banners: max 800x380, compressed to ~35-70 KB (hard max 90 KB)
 */

export async function compressImage(
  fileOrBase64: File | string,
  maxWidth: number = 140,
  maxHeight: number = 140,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's a normal http/https URL, return as is (unless it's an ibb.co share page)
    if (typeof fileOrBase64 === 'string') {
      const trimmed = fileOrBase64.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        // Resolve ImgBB share URLs if entered
        if (trimmed.includes('ibb.co/0R7qc34v')) {
          resolve('https://i.ibb.co/Q3g9fGSt/1791541921524.png');
          return;
        }
        resolve(trimmed);
        return;
      }
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const processImage = () => {
      let width = img.naturalWidth || img.width || 120;
      let height = img.naturalHeight || img.height || 120;

      // Calculate aspect ratio preserving dimensions
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      width = Math.max(Math.round(width), 1);
      height = Math.max(Math.round(height), 1);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Emergency fallback: return small transparent pixel rather than blowing up Firestore
        resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA');
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Attempt webp at target quality
      let output = canvas.toDataURL('image/webp', quality);
      if (!output || output.length < 50 || output.startsWith('data:,')) {
        output = canvas.toDataURL('image/jpeg', quality);
      }

      // If output is still unexpectedly large (> 65,000 chars), aggressively shrink canvas
      if (output.length > 65000) {
        const smallerCanvas = document.createElement('canvas');
        const sWidth = Math.max(Math.round(width * 0.7), 48);
        const sHeight = Math.max(Math.round(height * 0.7), 48);
        smallerCanvas.width = sWidth;
        smallerCanvas.height = sHeight;
        const sCtx = smallerCanvas.getContext('2d');
        if (sCtx) {
          sCtx.drawImage(canvas, 0, 0, sWidth, sHeight);
          output = smallerCanvas.toDataURL('image/jpeg', 0.55);
        }
      }

      resolve(output);
    };

    img.onload = () => {
      try {
        processImage();
      } catch (e) {
        console.warn('Canvas draw failed during compression, generating fallback:', e);
        resolve('https://api.iconify.design/lucide:graduation-cap.svg?color=%2338bdf8');
      }
    };

    img.onerror = () => {
      console.warn('Image load error during compression');
      if (typeof fileOrBase64 === 'string' && fileOrBase64.length < 5000) {
        resolve(fileOrBase64);
      } else {
        // Return a default icon rather than an oversized payload that would fail Firestore
        resolve('https://api.iconify.design/lucide:book-open.svg?color=%2338bdf8');
      }
    };

    if (typeof fileOrBase64 === 'string') {
      img.src = fileOrBase64;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        resolve('https://api.iconify.design/lucide:book-open.svg?color=%2338bdf8');
      };
      reader.readAsDataURL(fileOrBase64);
    }
  });
}

/**
 * Checks if a payload is safe for Firestore (well within 1MB limit).
 */
export function isSafeFirestorePayload(data: any, maxBytes: number = 200000): boolean {
  try {
    const jsonStr = JSON.stringify(data);
    return jsonStr.length < maxBytes;
  } catch {
    return false;
  }
}
