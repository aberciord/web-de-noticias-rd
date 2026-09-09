export function formatFecha(fecha: string | null): string {
  if (!fecha) return '';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatFechaCorta(fecha: string | null): string {
  if (!fecha) return '';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-DO', {
    month: 'short',
    day: 'numeric',
  });
}

export function tiempoRelativo(fecha: string | null): string {
  if (!fecha) return '';
  const date = new Date(fecha);
  const ahora = new Date();
  const diff = ahora.getTime() - date.getTime();
  const horas = Math.floor(diff / (1000 * 60 * 60));
  const minutos = Math.floor(diff / (1000 * 60));

  if (minutos < 1) return 'Hace un momento';
  if (minutos < 60) return `Hace ${minutos} min`;
  if (horas < 24) return `Hace ${horas}h`;
  const dias = Math.floor(horas / 24);
  if (dias < 7) return `Hace ${dias}d`;
  return formatFechaCorta(fecha);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80);
}
