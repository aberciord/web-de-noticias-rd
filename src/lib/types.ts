export type Categoria = 'noticias' | 'deportes' | 'politica' | 'farandula';

export type EstadoArticulo =
  | 'pendiente_revision'
  | 'aprobado'
  | 'rechazado'
  | 'publicado';

export type PosicionBanner = 'header' | 'sidebar' | 'entre_articulos' | 'footer';

export interface Source {
  id: string;
  nombre: string;
  feed_url: string;
  categoria: Categoria;
  idioma: string;
  activo: boolean;
  creado_en: string;
}

export interface RawItem {
  id: string;
  source_id: string | null;
  categoria: Categoria;
  titulo_original: string;
  resumen_original: string | null;
  url_original: string;
  fecha_publicacion: string | null;
  fecha_recoleccion: string;
  procesado: boolean;
  seleccionado: boolean;
}

export interface Article {
  id: string;
  raw_item_id: string | null;
  categoria: Categoria;
  titulo_es: string;
  cuerpo_es: string;
  titulo_en: string;
  cuerpo_en: string;
  resumen_seo: string | null;
  fuente_nombre: string | null;
  fuente_url: string | null;
  imagen_url: string | null;
  autor: string;
  estado: EstadoArticulo;
  creado_en: string;
  publicado_en: string | null;
}

export interface Banner {
  id: string;
  posicion: PosicionBanner;
  titulo: string | null;
  imagen_url: string;
  link: string | null;
  activo: boolean;
  creado_en: string;
}

export const CATEGORIAS: { value: Categoria; label: string; labelEn: string }[] = [
  { value: 'noticias', label: 'Noticias', labelEn: 'News' },
  { value: 'deportes', label: 'Deportes', labelEn: 'Sports' },
  { value: 'politica', label: 'Política', labelEn: 'Politics' },
  { value: 'farandula', label: 'Farándula', labelEn: 'Entertainment' },
];

export const ESTADOS: { value: EstadoArticulo; label: string; color: string }[] = [
  { value: 'pendiente_revision', label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'aprobado', label: 'Aprobado', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'rechazado', label: 'Rechazado', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'publicado', label: 'Publicado', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
];

export function getCategoriaLabel(value: Categoria): string {
  return CATEGORIAS.find((c) => c.value === value)?.label ?? value;
}

export function getEstadoLabel(value: EstadoArticulo): string {
  return ESTADOS.find((e) => e.value === value)?.label ?? value;
}

export function getEstadoColor(value: EstadoArticulo): string {
  return ESTADOS.find((e) => e.value === value)?.color ?? 'bg-gray-100 text-gray-800 border-gray-200';
}
