export function pexelsResize(url: string | null | undefined, width: number): string {
  if (!url) return '';
  if (!url.includes('images.pexels.com')) return url;
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
