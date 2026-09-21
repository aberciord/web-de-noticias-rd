import { supabase } from '@/lib/supabase';

const BUCKET = 'article-images';

// Redimensiona (máx. 1600 px) y convierte a JPEG en el navegador: acepta fotos
// grandes o en formatos como HEIC (iPhone) y mantiene el peso bajo el límite.
function prepareImage(file: File, maxBytes: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('El navegador no pudo procesar la imagen.'));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const encode = (quality: number) =>
        canvas.toBlob((blob) => {
          if (!blob) return reject(new Error('No se pudo convertir la imagen.'));
          if (blob.size > maxBytes && quality > 0.5) return encode(quality - 0.15);
          if (blob.size > maxBytes) return reject(new Error('La imagen pesa demasiado incluso comprimida.'));
          resolve(blob);
        }, 'image/jpeg', quality);
      encode(0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen. Prueba con un archivo JPG o PNG.'));
    };
    img.src = url;
  });
}

/** Sube una imagen al bucket público `article-images` y devuelve su URL pública. */
export async function uploadImage(file: File, maxBytes = 4 * 1024 * 1024): Promise<string> {
  const blob = await prepareImage(file, maxBytes);
  const path = `${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
