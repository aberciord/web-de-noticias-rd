import { useEffect, useRef, useState } from 'react';
import { Image, Upload, Loader2, Plus, Trash2, Edit3, X, Check, Power } from 'lucide-react';
import { adminSupabase as supabase } from '@/lib/adminSupabase';
import { CATEGORIAS } from '@/lib/types';
import { uploadImage } from '@/lib/uploadImage';
import type { Banner, PosicionBanner, Categoria } from '@/lib/types';

const POSICIONES: { value: PosicionBanner; label: string }[] = [
  { value: 'header', label: 'Encabezado' },
  { value: 'sidebar', label: 'Barra lateral' },
  { value: 'entre_articulos', label: 'Entre artículos' },
  { value: 'footer', label: 'Pie de página' },
];

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

async function validateBannerImage(url: string): Promise<string | null> {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return 'La URL debe apuntar a una imagen JPG, PNG o WebP (revisa la extensión del archivo).';
  }

  try {
    const res = await fetch(url, { method: 'HEAD' });
    const contentType = res.headers.get('content-type')?.toLowerCase().split(';')[0];
    const contentLength = res.headers.get('content-length');

    if (contentType && !ALLOWED_IMAGE_TYPES.includes(contentType)) {
      return `Formato no permitido (${contentType}). Usa JPG, PNG o WebP.`;
    }
    if (contentLength && Number(contentLength) > MAX_IMAGE_BYTES) {
      return `La imagen pesa ${(Number(contentLength) / 1024 / 1024).toFixed(1)}MB — el máximo permitido es 2MB.`;
    }
  } catch {
    // El servidor de la imagen no permite verificar tipo/peso desde el navegador
    // (CORS). La extensión ya se validó arriba, así que se deja pasar.
  }

  return null;
}

interface BannerForm {
  posicion: PosicionBanner;
  categoria: Categoria | '';
  titulo: string;
  imagen_url: string;
  link: string;
  activo: boolean;
}

const EMPTY_FORM: BannerForm = { posicion: 'header', categoria: '', titulo: '', imagen_url: '', link: '', activo: true };

export default function BannersManager() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = () => {
    supabase
      .from('banners')
      .select('*')
      .order('creado_en', { ascending: false })
      .then(({ data }) => {
        setBanners(data as Banner[] ?? []);
        setLoading(false);
      });
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setShowForm(false);
    setError(null);
  };

  const handleUpload = async (file: File) => {
    setError(null);
    setUploading(true);
    try {
      const url = await uploadImage(file, MAX_IMAGE_BYTES);
      setForm((f) => ({ ...f, imagen_url: url }));
    } catch (err) {
      setError(`No se pudo subir la imagen: ${err instanceof Error ? err.message : 'error desconocido'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const imageError = await validateBannerImage(form.imagen_url);
    if (imageError) {
      setError(imageError);
      setSaving(false);
      return;
    }

    const payload = { ...form, categoria: form.categoria || null };

    if (editing) {
      const { error } = await supabase.from('banners').update(payload).eq('id', editing.id);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('banners').insert(payload);
      if (error) { setError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    resetForm();
    loadBanners();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este banner?')) return;
    await supabase.from('banners').delete().eq('id', id);
    loadBanners();
  };

  const toggleActive = async (banner: Banner) => {
    await supabase.from('banners').update({ activo: !banner.activo }).eq('id', banner.id);
    loadBanners();
  };

  const startEdit = (banner: Banner) => {
    setEditing(banner);
    setForm({
      posicion: banner.posicion,
      categoria: banner.categoria ?? '',
      titulo: banner.titulo ?? '',
      imagen_url: banner.imagen_url,
      link: banner.link ?? '',
      activo: banner.activo,
    });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Banners</h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona los banners publicitarios del sitio</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar banner
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">{editing ? 'Editar banner' : 'Nuevo banner'}</h3>
            <button onClick={resetForm} className="p-1 rounded hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Posición</label>
              <select
                value={form.posicion}
                onChange={(e) => setForm({ ...form, posicion: e.target.value as PosicionBanner })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-white"
              >
                {POSICIONES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría</label>
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria | '' })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-white"
              >
                <option value="">Todas (portada / general)</option>
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>Solo {c.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-400 mt-1">
                Si eliges una categoría, este banner de encabezado solo se muestra en esa página; las demás
                siguen usando el banner "Todas".
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Título (opcional)</label>
              <input
                type="text"
                value={form.titulo}
                onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="Ej: Promo Banco"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Imagen <span className="text-slate-400 font-normal">(sube un archivo o pega una URL; máx. 2MB; ideal 1248 × 208 px para el encabezado)</span>
              </label>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith('image/'));
                  if (f) handleUpload(f);
                }}
                className="flex items-center justify-center gap-2 w-full mb-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Subiendo...' : 'Subir imagen desde tu computadora (clic o arrastrar)'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = '';
                }}
              />
              <input
                type="url"
                required
                value={form.imagen_url}
                onChange={(e) => setForm({ ...form, imagen_url: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="https://..."
              />
              {form.imagen_url && (
                <img src={form.imagen_url} alt="" className="mt-2 rounded-lg w-full h-auto max-h-64 object-contain bg-slate-100" />
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Link del banner</label>
              <input
                type="url"
                value={form.link}
                onChange={(e) => setForm({ ...form, link: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="https://..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                Activo
              </label>
            </div>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Verificando y guardando...' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-slate-400">Cargando...</div>
      ) : banners.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Image className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">No hay banners configurados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-md ${
                banner.activo ? 'border-slate-200' : 'border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3 gap-2">
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs font-semibold text-white bg-slate-700 px-2.5 py-1 rounded-full">
                    {POSICIONES.find((p) => p.value === banner.posicion)?.label}
                  </span>
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                    {banner.categoria ? CATEGORIAS.find((c) => c.value === banner.categoria)?.label : 'Todas'}
                  </span>
                </div>
                <button
                  onClick={() => toggleActive(banner)}
                  className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${banner.activo ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>
              <img src={banner.imagen_url} alt={banner.titulo ?? ''} className="w-full h-auto max-h-40 object-contain bg-slate-100 rounded-lg mb-3" />
              {banner.titulo && <p className="text-sm font-medium text-slate-700 mb-2 truncate">{banner.titulo}</p>}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(banner)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(banner.id)}
                  className="flex items-center gap-1 text-xs font-medium text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
