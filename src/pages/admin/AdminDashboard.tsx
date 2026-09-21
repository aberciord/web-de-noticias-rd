import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileEdit, CheckCircle, XCircle, Globe, TrendingUp, Clock, ArrowRight, Zap, AlertTriangle, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CATEGORIAS, getEstadoColor, getEstadoLabel } from '@/lib/types';
import type { Article, Categoria, EstadoArticulo } from '@/lib/types';

interface CronRunLog {
  id: number;
  job_name: string;
  run_at: string;
  status_code: number;
  response_body: string;
  success: boolean;
}
import { tiempoRelativo } from '@/lib/format';

export default function AdminDashboard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [cronLogs, setCronLogs] = useState<CronRunLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<string | null>(null);

  // Artículos cuya imagen ya se revisó a mano y no corresponde a la noticia.
  const WRONG_IMAGE_IDS = [
    'fb9259f3-21a8-4204-90d1-8178af592b34',
    '5172b42c-1115-4f26-bfc8-63a1bb8f69bb',
    '889a7150-616b-47e8-9afe-c6030d7b27d5',
  ];

  const handleFixImages = async () => {
    setFixing(true);
    setFixResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fix-article-images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ force_ids: WRONG_IMAGE_IDS }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `Error ${res.status}`);
      const lines = CATEGORIAS.map((c) => {
        const r = body.por_categoria?.[c.value];
        return r ? `${c.label}: ${r.incorrectas} incorrectas, ${r.corregidas} corregidas (de ${r.revisados})` : `${c.label}: 0`;
      });
      setFixResult(lines.join(' · '));
    } catch (err) {
      setFixResult(err instanceof Error ? err.message : 'Error al corregir imágenes');
    } finally {
      setFixing(false);
    }
  };

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

    supabase
      .from('cron_run_log')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        setCronLogs(data as CronRunLog[] ?? []);
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
          to="/panel-8f3k2qx9/revision"
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          <FileEdit className="w-4 h-4" />
          Ir a revisión
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-900">Corregir imágenes de artículos publicados</h3>
          <p className="text-sm text-slate-500 mt-1">
            Asigna una imagen de Pexels a los artículos sin imagen o con imagen repetida o incorrecta.
          </p>
          {fixResult && <p className="text-sm text-slate-700 mt-2">{fixResult}</p>}
        </div>
        <button
          onClick={handleFixImages}
          disabled={fixing}
          className="flex items-center gap-2 bg-violet-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition-colors flex-shrink-0"
        >
          {fixing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          {fixing ? 'Corrigiendo...' : 'Corregir imágenes'}
        </button>
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
            <Link to="/panel-8f3k2qx9/revision" className="text-sm text-red-600 hover:underline flex items-center gap-1">
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
                  to={`/panel-8f3k2qx9/editar/${article.id}`}
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

      {/* Pipeline execution log */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-amber-500" />
          <h2 className="font-bold text-slate-900">Ejecuciones del pipeline automático</h2>
          <span className="text-xs text-slate-400 ml-auto">7:00 AM y 3:00 PM (hora RD)</span>
        </div>
        {cronLogs.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">
            No hay ejecuciones registradas. El pipeline corre automáticamente dos veces al día.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wider">
                  <th className="pb-2 pr-4 font-semibold">Fecha</th>
                  <th className="pb-2 pr-4 font-semibold">Estado</th>
                  <th className="pb-2 pr-4 font-semibold">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cronLogs.map((log) => {
                  let summary = '';
                  try {
                    const parsed = JSON.parse(log.response_body);
                    summary = parsed.sources_checked != null
                      ? `${parsed.raw_items_collected} items, ${parsed.articles_generated} artículos`
                      : parsed.message ?? parsed.error ?? '';
                  } catch {
                    summary = log.response_body?.substring(0, 80) ?? '';
                  }
                  return (
                    <tr key={log.id} className="py-2">
                      <td className="py-3 pr-4 text-slate-600 whitespace-nowrap">
                        {new Date(log.run_at).toLocaleString('es-DO', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 pr-4">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                            <CheckCircle className="w-3 h-3" /> OK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded">
                            <AlertTriangle className="w-3 h-3" /> Error
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-600 text-xs">{summary}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
