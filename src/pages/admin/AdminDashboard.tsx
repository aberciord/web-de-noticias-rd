import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileEdit, CheckCircle, XCircle, Globe, TrendingUp, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CATEGORIAS, getEstadoColor, getEstadoLabel } from '@/lib/types';
import type { Article, Categoria, EstadoArticulo } from '@/lib/types';
import { tiempoRelativo } from '@/lib/format';

export default function AdminDashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('articles')
      .select('*')
      .order('creado_en', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setArticles(data as Article[] ?? []);
        setLoading(false);
      });
  }, []);

  const counts = {
    pendiente_revision: articles.filter((a) => a.estado === 'pendiente_revision').length,
    aprobado: articles.filter((a) => a.estado === 'aprobado').length,
    rechazado: articles.filter((a) => a.estado === 'rechazado').length,
    publicado: articles.filter((a) => a.estado === 'publicado').length,
  };

  const byCategory = CATEGORIAS.map((cat) => ({
    ...cat,
    count: articles.filter((a) => a.categoria === cat.value && a.estado === 'publicado').length,
  }));

  const recentPending = articles
    .filter((a) => a.estado === 'pendiente_revision')
    .slice(0, 5);

  const stats = [
    { label: 'Pendientes', value: counts.pendiente_revision, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Aprobados', value: counts.aprobado, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Rechazados', value: counts.rechazado, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Publicados', value: counts.publicado, icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Resumen general del contenido editorial</p>
        </div>
        <Link
          to="/admin/revision"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <FileEdit className="w-4 h-4" />
          Ir a revisión
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending review queue */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Cola de revisión</h2>
            <Link to="/admin/revision" className="text-sm text-red-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentPending.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No hay artículos pendientes.</p>
          ) : (
            <div className="space-y-3">
              {recentPending.map((article) => (
                <Link
                  key={article.id}
                  to={`/admin/editar/${article.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors group"
                >
                  {article.imagen_url && (
                    <img src={article.imagen_url} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-red-600 transition-colors truncate">
                      {article.titulo_es}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {CATEGORIAS.find((c) => c.value === article.categoria)?.label} · {tiempoRelativo(article.creado_en)}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded border ${getEstadoColor(article.estado)}`}>
                    {getEstadoLabel(article.estado)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* By category */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-bold text-slate-900 mb-4">Publicados por categoría</h2>
          <div className="space-y-4">
            {byCategory.map((cat) => (
              <div key={cat.value}>
                <div className="flex items-center justify-between mb-1.5">
                  <Link
                    to={`/categoria/${cat.value}`}
                    className="text-sm font-medium text-slate-700 hover:text-slate-900"
                  >
                    {cat.label}
                  </Link>
                  <span className="text-sm font-bold text-slate-900">{cat.count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-600 rounded-full transition-all duration-500"
                    style={{ width: `${counts.publicado > 0 ? (cat.count / counts.publicado) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-500">
            <TrendingUp className="w-4 h-4" />
            Total publicado: {counts.publicado}
          </div>
        </div>
      </div>
    </div>
  );
}
