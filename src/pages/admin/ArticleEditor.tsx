import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, CheckCircle, XCircle, Globe, ArrowLeft, Sparkles, AlertCircle, Eye, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CATEGORIAS, ESTADOS, getEstadoColor, getEstadoLabel } from '@/lib/types';
import type { Article, Categoria, EstadoArticulo } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';

interface PexelsResult {
  id: number;
  thumb_url: string;
  full_url: string;
  photographer: string;
  alt: string;
}

export default function ArticleEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = Boolean(id);

  const [article, setArticle] = useState<Partial<Article>>({
    categoria: 'noticias',
    titulo_es: '',
    cuerpo_es: '',
    titulo_en: '',
    cuerpo_en: '',
    resumen_seo: '',
    fuente_nombre: '',
    fuente_url: '',
    imagen_url: '',
    autor: 'IA',
    estado: 'pendiente_revision',
  });
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genInput, setGenInput] = useState('');
  const [showGenPanel, setShowGenPanel] = useState(false);
  const [previewLang, setPreviewLang] = useState<'es' | 'en'>('es');
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [imageQuery, setImageQuery] = useState('');
  const [imageResults, setImageResults] = useState<PexelsResult[]>([]);
  const [imageSearching, setImageSearching] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setArticle(data as Article);
        }
        setLoading(false);
      });
  }, [id]);

  const update = (field: keyof Article, value: string) => {
    setArticle((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (newEstado?: EstadoArticulo) => {
    setSaving(true);
    setError(null);

    const estado = newEstado ?? article.estado ?? 'pendiente_revision';
    const data: Record<string, unknown> = {
      categoria: article.categoria,
      titulo_es: article.titulo_es,
      cuerpo_es: article.cuerpo_es,
      titulo_en: article.titulo_en,
      cuerpo_en: article.cuerpo_en,
      resumen_seo: article.resumen_seo,
      fuente_nombre: article.fuente_nombre,
      fuente_url: article.fuente_url,
      imagen_url: article.imagen_url,
      autor: article.autor ?? 'IA',
      estado,
    };

    if (estado === 'publicado' && !article.publicado_en) {
      data.publicado_en = new Date().toISOString();
    }

    let result;
    if (isEditing && id) {
      result = await supabase.from('articles').update(data).eq('id', id);
    } else {
      result = await supabase.from('articles').insert(data).select();
    }

    setSaving(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    navigate('/admin/revision');
  };

  const handleGenerateDraft = async () => {
    if (!genInput.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-draft`;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      };
      if (user) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.access_token) {
          headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
        }
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ input_text: genInput, categoria: article.categoria }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Error ${response.status}`);
      }

      const data = await response.json();

      if (data.titulo_es) {
        setArticle((prev) => ({
          ...prev,
          titulo_es: data.titulo_es ?? prev.titulo_es,
          cuerpo_es: data.cuerpo_es ?? prev.cuerpo_es,
          titulo_en: data.titulo_en ?? prev.titulo_en,
          cuerpo_en: data.cuerpo_en ?? prev.cuerpo_en,
          resumen_seo: data.resumen_seo ?? prev.resumen_seo,
          autor: 'IA',
        }));
        setShowGenPanel(false);
        setGenInput('');
      } else {
        setError('La respuesta de la IA no tiene el formato esperado.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar borrador');
    } finally {
      setGenerating(false);
    }
  };

  const handleSearchImages = async () => {
    if (!imageQuery.trim()) return;
    setImageSearching(true);
    setImageError(null);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-images?query=${encodeURIComponent(imageQuery)}`;
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token ?? import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `Error ${response.status}`);
      }

      const data = await response.json();
      setImageResults(data.results ?? []);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Error al buscar imágenes');
    } finally {
      setImageSearching(false);
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-slate-400">Cargando...</div>;
  }

  const currentEstado = article.estado as EstadoArticulo;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin/revision" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isEditing ? 'Editar artículo' : 'Nueva nota'}
            </h1>
            {isEditing && (
              <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded border ${getEstadoColor(currentEstado)}`}>
                {getEstadoLabel(currentEstado)}
              </span>
            )}
          </div>
        </div>

        {/* AI generation toggle */}
        <button
          onClick={() => setShowGenPanel(!showGenPanel)}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          Generar borrador con IA
        </button>
      </div>

      {/* AI Generation panel */}
      {showGenPanel && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-600" />
            <h3 className="font-bold text-violet-900">Generar borrador con IA</h3>
          </div>
          <p className="text-sm text-violet-700">
            Pega el texto de una nota de prensa, comunicado o información base. La IA generará una nota
            periodística original en español e inglés, sin copiar el texto fuente.
          </p>
          <textarea
            value={genInput}
            onChange={(e) => setGenInput(e.target.value)}
            rows={5}
            placeholder="Pega aquí el texto o información de base..."
            className="w-full p-3 border border-violet-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white"
          />
          <div className="flex gap-2">
            <button
              onClick={handleGenerateDraft}
              disabled={generating || !genInput.trim()}
              className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Generando...' : 'Generar'}
            </button>
            <button
              onClick={() => setShowGenPanel(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-violet-700 hover:bg-violet-100 transition-colors"
            >
              Cancelar
            </button>
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>
      )}

      {error && !showGenPanel && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Editor form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor */}
        <div className="lg:col-span-2 space-y-4">
          {/* Language tabs */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex border-b border-slate-200">
              <button
                onClick={() => setPreviewLang('es')}
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  previewLang === 'es' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                Español
              </button>
              <button
                onClick={() => setPreviewLang('en')}
                className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  previewLang === 'en' ? 'border-red-600 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                English
              </button>
            </div>

            <div className="p-5 space-y-4">
              {previewLang === 'es' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Título (Español)</label>
                    <input
                      type="text"
                      value={article.titulo_es ?? ''}
                      onChange={(e) => update('titulo_es', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-lg font-semibold"
                      placeholder="Título de la nota..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Cuerpo (Español)</label>
                    <textarea
                      value={article.cuerpo_es ?? ''}
                      onChange={(e) => update('cuerpo_es', e.target.value)}
                      rows={14}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-sm leading-relaxed resize-y"
                      placeholder="Escribe el cuerpo de la nota en español..."
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Title (English)</label>
                    <input
                      type="text"
                      value={article.titulo_en ?? ''}
                      onChange={(e) => update('titulo_en', e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-lg font-semibold"
                      placeholder="Article title..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Body (English)</label>
                    <textarea
                      value={article.cuerpo_en ?? ''}
                      onChange={(e) => update('cuerpo_en', e.target.value)}
                      rows={14}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-sm leading-relaxed resize-y"
                      placeholder="Write the article body in English..."
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Preview */}
          {article.titulo_es && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-bold text-slate-700">Vista previa</h3>
              </div>
              <div className="border-l-4 border-red-600 pl-4">
                <span className="text-xs font-semibold text-red-600 uppercase">
                  {CATEGORIAS.find((c) => c.value === article.categoria)?.label}
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  {previewLang === 'es' ? article.titulo_es : article.titulo_en}
                </h2>
                {article.resumen_seo && (
                  <p className="text-sm text-slate-600 mt-2">{article.resumen_seo}</p>
                )}
                {article.imagen_url && (
                  <img src={article.imagen_url} alt="" className="mt-3 rounded-lg w-full max-h-48 object-cover" />
                )}
                <p className="text-sm text-slate-700 mt-3 line-clamp-4 leading-relaxed whitespace-pre-line">
                  {previewLang === 'es' ? article.cuerpo_es : article.cuerpo_en}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Settings */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900">Configuración</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría</label>
              <select
                value={article.categoria ?? 'noticias'}
                onChange={(e) => update('categoria', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-white"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Resumen SEO</label>
              <textarea
                value={article.resumen_seo ?? ''}
                onChange={(e) => update('resumen_seo', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="Breve descripción para SEO..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">URL de imagen</label>
                <button
                  type="button"
                  onClick={() => setShowImageSearch(!showImageSearch)}
                  className="flex items-center gap-1 text-xs font-medium text-violet-600 hover:text-violet-700 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Buscar en Pexels
                </button>
              </div>
              <input
                type="url"
                value={article.imagen_url ?? ''}
                onChange={(e) => update('imagen_url', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="https://..."
              />
              {article.imagen_url && (
                <img src={article.imagen_url} alt="" className="mt-2 rounded-lg w-full h-24 object-cover" />
              )}

              {showImageSearch && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={imageQuery}
                      onChange={(e) => setImageQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchImages())}
                      placeholder="Ej: transporte público Santo Domingo"
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleSearchImages}
                      disabled={imageSearching || !imageQuery.trim()}
                      className="flex items-center gap-1 bg-violet-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors"
                    >
                      {imageSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                    </button>
                  </div>

                  {imageError && (
                    <p className="text-xs text-red-600">{imageError}</p>
                  )}

                  {imageResults.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {imageResults.map((img) => (
                        <button
                          type="button"
                          key={img.id}
                          onClick={() => {
                            update('imagen_url', img.full_url);
                            setShowImageSearch(false);
                          }}
                          className="group relative rounded-lg overflow-hidden border-2 border-transparent hover:border-violet-500 transition-colors"
                          title={`Foto de ${img.photographer} en Pexels`}
                        >
                          <img src={img.thumb_url} alt={img.alt} className="w-full h-16 object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Autor</label>
              <input
                type="text"
                value={article.autor ?? ''}
                onChange={(e) => update('autor', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="Nombre del autor..."
              />
            </div>
          </div>

          {/* Source */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-slate-900">Fuente</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre de la fuente</label>
              <input
                type="text"
                value={article.fuente_nombre ?? ''}
                onChange={(e) => update('fuente_nombre', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="Ej: Listín Diario"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">URL de la fuente</label>
              <input
                type="url"
                value={article.fuente_url ?? ''}
                onChange={(e) => update('fuente_url', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2">
            <h3 className="font-bold text-slate-900 mb-3">Acciones</h3>

            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Estado</label>
                <select
                  value={article.estado ?? 'pendiente_revision'}
                  onChange={(e) => update('estado', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-white mb-3"
                >
                  {ESTADOS.map((e) => (
                    <option key={e.value} value={e.value}>{e.label}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              onClick={() => handleSave()}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar borrador'}
            </button>

            <button
              onClick={() => handleSave('publicado')}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Globe className="w-4 h-4" />
              Aprobar y publicar
            </button>

            {isEditing && (
              <button
                onClick={() => handleSave('rechazado')}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 text-red-600 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors border border-red-200"
              >
                <XCircle className="w-4 h-4" />
                Rechazar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
