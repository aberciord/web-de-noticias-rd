import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ArrowLeft, Clock, ExternalLink, Share2, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { getCategoriaLabel } from '@/lib/types';
import type { Article, Banner } from '@/lib/types';
import { formatFecha, tiempoRelativo } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useDocumentMeta } from '@/lib/useDocumentMeta';
import ArticleCard from '@/components/public/ArticleCard';
import CommentSection from '@/components/public/CommentSection';

interface ArticlePageProps {
  articles: Article[];
}

export default function ArticlePage({ articles }: ArticlePageProps) {
  const { id } = useParams<{ id: string }>();
  const { language, setLanguage } = useLanguage();
  const [sidebarBanner, setSidebarBanner] = useState<Banner | null>(null);
  const [midBanner, setMidBanner] = useState<Banner | null>(null);

  const article = articles.find((a) => a.id === id);

  useDocumentMeta({
    title: article
      ? `${language === 'es' ? article.titulo_es : article.titulo_en} — El poder del pueblo RD`
      : 'El poder del pueblo RD',
    description: article?.resumen_seo ?? undefined,
    image: article?.imagen_url ?? undefined,
  });

  useEffect(() => {
    supabase
      .from('banners')
      .select('*')
      .eq('posicion', 'sidebar')
      .eq('activo', true)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setSidebarBanner(data as Banner | null));

    supabase
      .from('banners')
      .select('*')
      .eq('posicion', 'entre_articulos')
      .eq('activo', true)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setMidBanner(data as Banner | null));
  }, [id]);

  if (!article) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">{language === 'en' ? 'Article not found.' : 'Artículo no encontrado.'}</p>
        <Link to="/" className="mt-4 inline-block text-red-600 hover:underline">
          {language === 'en' ? 'Back to home' : 'Volver al inicio'}
        </Link>
      </div>
    );
  }

  const related = articles
    .filter((a) => a.categoria === article.categoria && a.id !== article.id)
    .slice(0, 3);

  const titulo = language === 'es' ? article.titulo_es : article.titulo_en;
  const cuerpo = language === 'es' ? article.cuerpo_es : article.cuerpo_en;
  const fuenteLabel = language === 'es' ? 'Fuente' : 'Source';

  const paragraphs = cuerpo.split('\n').filter((p) => p.trim());

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
        <Link to="/" className="hover:text-slate-900 transition-colors">{language === 'en' ? 'Home' : 'Inicio'}</Link>
        <span>/</span>
        <Link to={`/categoria/${article.categoria}`} className="hover:text-slate-900 transition-colors">
          {getCategoriaLabel(article.categoria, language)}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main article */}
        <article className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-bold text-white bg-red-600 px-3 py-1 rounded-full uppercase tracking-wide">
              {getCategoriaLabel(article.categoria, language)}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tiempoRelativo(article.publicado_en)}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 leading-tight mb-3">
            {titulo}
          </h1>

          {article.resumen_seo && (
            <p className="text-lg text-slate-600 leading-relaxed mb-4">{article.resumen_seo}</p>
          )}

          <div className="flex items-center justify-between border-y border-slate-200 py-3 mb-6">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-sm text-slate-600">
                <User className="w-4 h-4" />
                {article.autor}
              </span>
              <span className="text-sm text-slate-400 hidden sm:inline">
                {formatFecha(article.publicado_en)}
              </span>
            </div>

            {/* Language toggle */}
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setLanguage('es')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  language === 'es' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                ES
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                  language === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {article.imagen_url && (
            <div className="mb-6 rounded-xl overflow-hidden">
              <img src={article.imagen_url} alt={titulo} className="w-full object-cover" />
            </div>
          )}

          {/* Mid-article banner */}
          {midBanner && (
            <div className="my-6 rounded-lg overflow-hidden">
              <a href={midBanner.link ?? '#'} target="_blank" rel="noopener noreferrer">
                <img src={midBanner.imagen_url} alt={midBanner.titulo ?? 'Publicidad'} className="w-full object-cover" />
              </a>
            </div>
          )}

          <div className="prose prose-lg max-w-none">
            {paragraphs.map((para, i) => (
              <p key={i} className="text-slate-700 leading-relaxed text-base sm:text-lg mb-4">
                {para}
              </p>
            ))}
          </div>

          {/* Source citation — siempre al final del cuerpo, en letra pequeña */}
          {article.fuente_nombre && (
            <div className="mt-6 pt-3 border-t border-slate-200 flex items-center gap-1.5">
              <span className="text-xs text-slate-500">{fuenteLabel}:</span>
              {article.fuente_url ? (
                <a
                  href={article.fuente_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-red-600 hover:underline flex items-center gap-1"
                >
                  {article.fuente_nombre}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-xs font-medium text-slate-600">{article.fuente_nombre}</span>
              )}
            </div>
          )}

          {/* Share */}
          <div className="mt-6 flex items-center gap-3">
            <span className="text-sm text-slate-500 flex items-center gap-1">
              <Share2 className="w-4 h-4" /> {language === 'en' ? 'Share:' : 'Compartir:'}
            </span>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
              }}
              className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              {language === 'en' ? 'Copy link' : 'Copiar enlace'}
            </button>
          </div>

          {/* Comments */}
          <CommentSection articleId={article.id} />

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
            <Link
              to={`/categoria/${article.categoria}`}
              className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              {getCategoriaLabel(article.categoria, language)}
            </Link>
            <Link
              to="/"
              className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {language === 'en' ? 'Home' : 'Inicio'}
            </Link>
          </div>
        </article>

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-6">
          {sidebarBanner && (
            <div className="rounded-lg overflow-hidden">
              <a href={sidebarBanner.link ?? '#'} target="_blank" rel="noopener noreferrer">
                <img src={sidebarBanner.imagen_url} alt={sidebarBanner.titulo ?? 'Publicidad'} className="w-full" />
              </a>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">
              {language === 'es' ? 'Más leído' : 'Most read'}
            </h3>
            <div className="space-y-4">
              {related.map((relArticle) => (
                <ArticleCard key={relArticle.id} article={relArticle} variant="compact" />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
