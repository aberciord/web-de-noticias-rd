import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Clock, ExternalLink, Share2, ChevronLeft, User, Link2, Check } from 'lucide-react';
import { getCategoriaLabel } from '@/lib/types';
import type { Article, Banner } from '@/lib/types';
import { formatFecha, tiempoRelativo } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useDocumentMeta } from '@/lib/useDocumentMeta';
import { pexelsResize } from '@/lib/imageOptimize';
import { safeHref } from '@/lib/safeUrl';
import ArticleCard from '@/components/public/ArticleCard';
import CommentSection from '@/components/public/CommentSection';

// Ícono de WhatsApp: lucide-react no tiene el logo de la marca, así que se
// dibuja como SVG propio, al mismo trazo (stroke) que los demás íconos.
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91.01-5.47-4.44-9.92-9.9-9.92Zm0 18.15h-.01c-1.48 0-2.94-.4-4.21-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.21 8.21 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.55-3.7 8.23-8.22 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.7-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.39-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.42-.14-.01-.31-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.87.85-.87 2.08 0 1.22.89 2.41 1.02 2.58.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.28Z" />
    </svg>
  );
}

interface ArticlePageProps {
  articles: Article[];
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
  const [midBanner, setMidBanner] = useState<Banner | null>(null);

  const article = articles.find((a) => a.id === id);

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

          {/* Mid-article banner */}
          {midBanner && (
            <div className="my-6 rounded-lg overflow-hidden">
              <a href={safeHref(midBanner.link)} target="_blank" rel="noopener noreferrer">
                <img src={midBanner.imagen_url} alt={midBanner.titulo ?? 'Publicidad'} loading="lazy" className="w-full h-auto" />
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
          {sidebarBanner && (
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
