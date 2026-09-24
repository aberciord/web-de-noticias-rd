// Dominios que ya sirven la imagen en un tamaño razonable (Pexels, con
// redimensionado propio más abajo) o que son nuestros (Supabase Storage,
// subidas desde el panel) — todo lo demás es la imagen original de la
// fuente RSS, a veces a resolución completa (varios cientos de KB a
// resolución de escritorio en un artículo que se ve a 500px de ancho).
// Esas se pasan por wsrv.nl (proxy de imágenes gratuito y público, sin
// backend propio que mantener) para redimensionarlas y servirlas en WebP.
const OWN_IMAGE_HOSTS = ['xhfqkhzyoonihxxkwrki.supabase.co', 'elpoderdelpueblord.com'];

export function pexelsResize(url: string | null | undefined, width: number): string {
  if (!url) return '';
  if (url.includes('images.pexels.com')) {
    try {
      const u = new URL(url);
      u.searchParams.set('auto', 'compress');
      u.searchParams.set('cs', 'tinysrgb');
      u.searchParams.set('w', String(width));
      return u.toString();
    } catch {
      return url;
    }
  }

  try {
    const u = new URL(url);
    if (OWN_IMAGE_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith(`.${h}`))) return url;
  } catch {
    return url;
  }

  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp&q=80`;
}
