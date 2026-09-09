import { useEffect, useState } from 'react';
import { Rss, Plus, Trash2, Edit3, X, Check, Power } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CATEGORIAS } from '@/lib/types';
import type { Source, Categoria } from '@/lib/types';

export default function SourcesManager() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Source | null>(null);
  const [form, setForm] = useState({ nombre: '', feed_url: '', categoria: 'noticias' as Categoria, idioma: 'es' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSources();
  }, []);

  const loadSources = () => {
    supabase
      .from('sources')
      .select('*')
      .order('categoria', { ascending: true })
      .order('nombre', { ascending: true })
      .then(({ data }) => {
        setSources(data as Source[] ?? []);
        setLoading(false);
      });
  };

  const resetForm = () => {
    setForm({ nombre: '', feed_url: '', categoria: 'noticias', idioma: 'es' });
    setEditing(null);
    setShowForm(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (editing) {
      const { error } = await supabase
        .from('sources')
        .update(form)
        .eq('id', editing.id);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase
        .from('sources')
        .insert(form);
      if (error) { setError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    resetForm();
    loadSources();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta fuente?')) return;
    await supabase.from('sources').delete().eq('id', id);
    loadSources();
  };

  const toggleActive = async (source: Source) => {
    await supabase.from('sources').update({ activo: !source.activo }).eq('id', source.id);
    loadSources();
  };

  const startEdit = (source: Source) => {
    setEditing(source);
    setForm({ nombre: source.nombre, feed_url: source.feed_url, categoria: source.categoria, idioma: source.idioma });
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fuentes RSS</h1>
          <p className="text-slate-500 text-sm mt-1">Gestiona las fuentes para el pipeline automático</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agregar fuente
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">{editing ? 'Editar fuente' : 'Nueva fuente'}</h3>
            <button onClick={resetForm} className="p-1 rounded hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Nombre</label>
              <input
                type="text"
                required
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="Ej: Listín Diario"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">URL del feed RSS</label>
              <input
                type="url"
                required
                value={form.feed_url}
                onChange={(e) => setForm({ ...form, feed_url: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Categoría</label>
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value as Categoria })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-white"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Idioma</label>
              <select
                value={form.idioma}
                onChange={(e) => setForm({ ...form, idioma: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-white"
              >
                <option value="es">Español</option>
                <option value="en">Inglés</option>
              </select>
            </div>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            <div className="sm:col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Guardando...' : 'Guardar'}
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

      {/* Sources list */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Cargando...</div>
      ) : sources.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Rss className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400">No hay fuentes configuradas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source) => (
            <div
              key={source.id}
              className={`bg-white rounded-xl border p-4 transition-shadow hover:shadow-md ${
                source.activo ? 'border-slate-200' : 'border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Rss className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{source.nombre}</h3>
                    <span className="text-xs text-red-600 font-medium uppercase">
                      {CATEGORIAS.find((c) => c.value === source.categoria)?.label}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(source)}
                  className={`p-1.5 rounded-lg transition-colors ${source.activo ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                  title={source.activo ? 'Desactivar' : 'Activar'}
                >
                  <Power className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-slate-400 truncate mb-3" title={source.feed_url}>
                {source.feed_url}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startEdit(source)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Edit3 className="w-3 h-3" />
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(source.id)}
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
