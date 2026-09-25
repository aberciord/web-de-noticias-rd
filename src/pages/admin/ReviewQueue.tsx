import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Clock, CheckCircle, XCircle, Globe } from 'lucide-react';
import { adminSupabase as supabase } from '@/lib/adminSupabase';
import { CATEGORIAS, ESTADOS, getEstadoColor, getEstadoLabel } from '@/lib/types';
import type { Article, Categoria, EstadoArticulo } from '@/lib/types';
import { tiempoRelativo } from '@/lib/format';

export default function ReviewQueue() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState<EstadoArticulo | 'todos'>('pendiente_revision');
  const [filterCategoria, setFilterCategoria] = useState<Categoria | 'todas'>('todas');
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('articles')
      .select('*')
      .order('creado_en', { ascending: false })
      .then(({ data }) => {
        setArticles(data as Article[] ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = articles.filter((a) => {
    if (filterEstado !== 'todos' && a.estado !== filterEstado) return false;
    if (filterCategoria !== 'todas' && a.categoria !== filterCategoria) return false;
    if (search && !a.titulo_es.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleQuickAction = async (id: string, newEstado: EstadoArticulo) => {
    const updateData: Record<string, unknown> = { estado: newEstado };
    if (newEstado === 'publicado') {
      updateData.publicado_en = new Date().toISOString();
    }

    const { error } = await supabase.from('articles').update(updateData).eq('id', id);
    if (error) {
      alert('Error al actualizar: ' + error.message);
      return;
    }

    setArticles((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, estado: newEstado, publicado_en: newEstado === 'publicado' ? new Date().toISOString() : a.publicado_en } : a
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cola de revisión</h1>
        <p className="text-slate-500 text-sm mt-1">Revisa, aprueba, rechaza y publica artículos</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título..."
              className="w-full pl-11 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="flex gap-3">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value as EstadoArticulo | 'todos')}
              className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-white"
            >
              <option value="todos">Todos los estados</option>
              {ESTADOS.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value as Categoria | 'todas')}
              className="px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-white"
            >
              <option value="todas">Todas las categorías</option>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Filter className="w-4 h-4" />
          {filtered.length} {filtered.length === 1 ? 'artículo' : 'artículos'}
        </div>
      </div>

      {/* Article list */}
      {loading ? (
        <div className="py-16 text-center text-slate-400">Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-slate-400">No hay artículos que coincidan con los filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((article) => (
            <div
              key={article.id}
              className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                {article.imagen_url && (
                  <img
                    src={article.imagen_url}
                    alt=""
                    className="w-full sm:w-28 h-28 rounded-lg object-cover flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-red-600 uppercase bg-red-50 px-2 py-0.5 rounded">
                      {CATEGORIAS.find((c) => c.value === article.categoria)?.label}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${getEstadoColor(article.estado)}`}>
                      {getEstadoLabel(article.estado)}
                    </span>
                    <span className="text-xs text-slate-400">por {article.autor}</span>
                  </div>
                  <Link to={`/panel-8f3k2qx9/editar/${article.id}`}>
                    <h3 className="font-bold text-slate-900 hover:text-red-600 transition-colors line-clamp-2 leading-snug">
                      {article.titulo_es}
                    </h3>
                  </Link>
                  {article.resumen_seo && (
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">{article.resumen_seo}</p>
                  )}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tiempoRelativo(article.creado_en)}
                    </span>
                    <div className="flex items-center gap-2">
                      {article.estado === 'pendiente_revision' && (
                        <>
                          <button
                            onClick={() => handleQuickAction(article.id, 'rechazado')}
                            className="flex items-center gap-1 text-xs font-medium text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            Rechazar
                          </button>
                          <button
                            onClick={() => handleQuickAction(article.id, 'publicado')}
                            className="flex items-center gap-1 text-xs font-medium text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Aprobar y publicar
                          </button>
                        </>
                      )}
                      {article.estado === 'aprobado' && (
                        <button
                          onClick={() => handleQuickAction(article.id, 'publicado')}
                          className="flex items-center gap-1 text-xs font-medium text-white bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors"
                        >
                          <Globe className="w-4 h-4" />
                          Publicar
                        </button>
                      )}
                      <Link
                        to={`/panel-8f3k2qx9/editar/${article.id}`}
                        className="text-xs font-medium text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                      >
                        Editar
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
