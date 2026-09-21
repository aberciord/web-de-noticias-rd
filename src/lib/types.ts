export type Categoria = 'noticias' | 'deportes' | 'politica' | 'entretenimiento';

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
  categoria: Categoria | null;
  titulo: string | null;
  imagen_url: string;
  link: string | null;
  activo: boolean;
  creado_en: string;
}

export interface Comment {
  id: number;
  article_id: string;
  user_id: string;
  autor_nombre: string;
  contenido: string;
  creado_en: string;
  eliminado: boolean;
}

export const CATEGORIAS: { value: Categoria; label: string; labelEn: string }[] = [
  { value: 'noticias', label: 'Noticias', labelEn: 'News' },
  { value: 'politica', label: 'Política', labelEn: 'Politics' },
  { value: 'deportes', label: 'Deportes', labelEn: 'Sports' },
  { value: 'entretenimiento', label: 'Entretenimiento', labelEn: 'Entertainment' },
];

export const ESTADOS: { value: EstadoArticulo; label: string; color: string }[] = [
  { value: 'pendiente_revision', label: 'Pendiente', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { value: 'aprobado', label: 'Aprobado', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { value: 'rechazado', label: 'Rechazado', color: 'bg-red-100 text-red-800 border-red-200' },
  { value: 'publicado', label: 'Publicado', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
];

export function getCategoriaLabel(value: Categoria, language: 'es' | 'en' = 'es'): string {
  const cat = CATEGORIAS.find((c) => c.value === value);
  if (!cat) return value;
  return language === 'en' ? cat.labelEn : cat.label;
}

export function getEstadoLabel(value: EstadoArticulo): string {
  return ESTADOS.find((e) => e.value === value)?.label ?? value;
}

export function getEstadoColor(value: EstadoArticulo): string {
  return ESTADOS.find((e) => e.value === value)?.color ?? 'bg-gray-100 text-gray-800 border-gray-200';
}
