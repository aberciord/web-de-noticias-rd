// Los enlaces "fuente" de un artículo vienen de feeds RSS externos, y los
// enlaces de banners los escribe un editor en un campo de texto libre.
// Ninguno de los dos es de fiar: un feed comprometido o un error de tipeo
// podría meter un esquema como "javascript:" en vez de una URL real, que el
// navegador ejecutaría al hacer clic. Esta función solo deja pasar los
// esquemas que un <a href> legítimo necesita.
const ALLOWED_SCHEMES = ['http:', 'https:', 'mailto:', 'tel:'];

export function safeHref(url: string | null | undefined, fallback = '#'): string {
  if (!url) return fallback;
  try {
    const parsed = new URL(url, window.location.origin);
    return ALLOWED_SCHEMES.includes(parsed.protocol) ? url : fallback;
  } catch {
    return fallback;
  }
}
