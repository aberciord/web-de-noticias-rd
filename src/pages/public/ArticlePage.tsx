import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, ExternalLink, Share2, ChevronLeft, User, Link2, Check } from 'lucide-react';
import { getCategoriaLabel } from '@/lib/types';
import type { ArticleListItem, Banner } from '@/lib/types';
import { formatFecha, tiempoRelativo } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useDocumentMeta } from '@/lib/useDocumentMeta';
import { pexelsResize } from '@/lib/imageOptimize';
import { safeHref } from '@/lib/safeUrl';
import ArticleCard from '@/components/public/ArticleCard';
import CommentSection from '@/components/public/CommentSection';
import WhatsAppIcon from '@/components/public/WhatsAppIcon';

interface ArticlePageProps {
  articles: ArticleListItem[];
}

export default function ArticlePage({ articles }: ArticlePageProps) {
  const { id } = useParams<{ id: string }>();
  const { language, setLanguage } = useLanguage();
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!shareOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) {
        setShareOpen(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [shareOpen]);
  const [sidebarBanner, setSidebarBanner] = useState<Banner | null>(null);
  const [sidebarBannerLoading, setSidebarBannerLoading] = useState(true);
  const [midBanner, setMidBanner] = useState<Banner | null>(null);
  const [midBannerLoading, setMidBannerLoading] = useState(true);
  const [cuerpo_es, setCuerpoEs] = useState<string | null>(null);
  const [cuerpo_en, setCuerpoEn] = useState<string | null>(null);

  const article = articles.find((a) => a.id === id);

  // El listado (prop `articles`) no trae el cuerpo del artículo — se pide
  // aparte, solo para el que está abierto, para no cargar el texto de los
  // ~100 artículos publicados en cada visita a home/categoría/artículo.
  useEffect(() => {
    setCuerpoEs(null);
    setCuerpoEn(null);
    if (!id) return;
    supabase
      .from('articles')
      .select('cuerpo_es, cuerpo_en')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        setCuerpoEs(data?.cuerpo_es ?? '');
        setCuerpoEn(data?.cuerpo_en ?? '');
      });
  }, [id]);

  useDocumentMeta({
    title: article
      ? `${language === 'es' ? article.titulo_es : article.titulo_en} — El poder del pueblo RD`
      : 'El poder del pueblo RD',
    description: article?.resumen_seo ?? undefined,
    image: article?.imagen_url ?? undefined,
    canonical: article ? `https://elpoderdelpueblord.com/articulo/${article.id}` : undefined,
    jsonLd: article
      ? {
          '@context': 'https://schema.org',
          '@type': 'NewsArticle',
          headline: language === 'es' ? article.titulo_es : article.titulo_en,
          description: article.resumen_seo ?? undefined,
          image: article.imagen_url ?? undefined,
          datePublished: article.publicado_en ?? undefined,
          author: { '@type': 'Organization', name: 'El poder del pueblo RD' },
          publisher: {
            '@type': 'Organization',
            name: 'El poder del pueblo RD',
            logo: { '@type': 'ImageObject', url: 'https://elpoderdelpueblord.com/logo.png' },
          },
          mainEntityOfPage: `https://elpoderdelpueblord.com/articulo/${article.id}`,
          articleSection: getCategoriaLabel(article.categoria, 'es'),
        }
      : undefined,
  });

  useEffect(() => {
    setSidebarBannerLoading(true);
    setMidBannerLoading(true);

    supabase
      .from('banners')
      .select('*')
      .eq('posicion', 'sidebar')
      .eq('activo', true)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setSidebarBanner(data as Banner | null);
        setSidebarBannerLoading(false);
      });

    supabase
      .from('banners')
      .select('*')
      .eq('posicion', 'entre_articulos')
      .eq('activo', true)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setMidBanner(data as Banner | null);
        setMidBannerLoading(false);
      });
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
  const cuerpo = language === 'es' ? cuerpo_es : cuerpo_en;
  const fuenteLabel = language === 'es' ? 'Fuente' : 'Source';

  const paragraphs = cuerpo ? cuerpo.split('\n').filter((p) => p.trim()) : [];

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
              <span className="text-sm text-slate-500 hidden sm:inline">
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
              <img
                src={pexelsResize(article.imagen_url, 1000)}
                alt={titulo}
                width={1000}
                height={625}
                loading="eager"
                fetchPriority="high"
                className="w-full object-cover"
              />
            </div>
          )}

          {/* Mid-article banner — se reserva el mismo espacio mientras se
              confirma si hay banner, para no correr el resto del artículo
              hacia abajo cuando llegue (CLS). */}
          {midBannerLoading && (
            <div className="my-6 rounded-lg overflow-hidden">
              <div className="w-full aspect-[2/1] rounded-lg bg-slate-100 animate-pulse" />
            </div>
          )}
          {!midBannerLoading && midBanner && (
            <div className="my-6 rounded-lg overflow-hidden">
              <a href={safeHref(midBanner.link)} target="_blank" rel="noopener noreferrer">
                <img src={midBanner.imagen_url} alt={midBanner.titulo ?? 'Publicidad'} loading="lazy" className="w-full h-auto" />
              </a>
            </div>
          )}

          <div className="prose prose-lg max-w-none">
            {cuerpo === null ? (
              <div className="space-y-3 animate-pulse" aria-hidden="true">
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-5/6" />
                <div className="h-4 bg-slate-100 rounded w-full" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
            ) : (
              paragraphs.map((para, i) => (
                <p key={i} className="text-slate-700 leading-relaxed text-base sm:text-lg mb-4">
                  {para}
                </p>
              ))
            )}
          </div>

          {/* Source citation — siempre al final del cuerpo, en letra pequeña */}
          {article.fuente_nombre && (
            <div className="mt-6 pt-3 border-t border-slate-200 flex items-center gap-1.5">
              <span className="text-xs text-slate-500">{fuenteLabel}:</span>
              {article.fuente_url ? (
                <a
                  href={safeHref(article.fuente_url)}
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
          <div className="mt-6 relative" ref={shareRef}>
            <button
              onClick={() => setShareOpen((v) => !v)}
              aria-expanded={shareOpen}
              aria-haspopup="true"
              className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Share2 className="w-4 h-4" /> {language === 'en' ? 'Share' : 'Compartir'}
            </button>

            {shareOpen && (
              <div className="absolute z-10 mt-2 w-56 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`${titulo} ${window.location.href}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setShareOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                  WhatsApp
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(window.location.href);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4 text-slate-500" />}
                  {copied
                    ? (language === 'en' ? 'Copied!' : '¡Copiado!')
                    : (language === 'en' ? 'Copy link' : 'Copiar enlace')}
                </button>
              </div>
            )}
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
          {sidebarBannerLoading && (
            <div className="rounded-lg overflow-hidden">
              <div className="w-full aspect-square rounded-lg bg-slate-100 animate-pulse" />
            </div>
          )}
          {!sidebarBannerLoading && sidebarBanner && (
            <div className="rounded-lg overflow-hidden">
              <a href={safeHref(sidebarBanner.link)} target="_blank" rel="noopener noreferrer">
                <img src={sidebarBanner.imagen_url} alt={sidebarBanner.titulo ?? 'Publicidad'} loading="lazy" className="w-full" />
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
