import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import type { Article } from '@/lib/types';
import { getCategoriaLabel } from '@/lib/types';
import { tiempoRelativo } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';
import { pexelsResize } from '@/lib/imageOptimize';

interface ArticleCardProps {
  article: Article;
  variant?: 'default' | 'horizontal' | 'compact';
}

export default function ArticleCard({ article, variant = 'default' }: ArticleCardProps) {
  const { language } = useLanguage();
  const titulo = language === 'en' ? article.titulo_en : article.titulo_es;

  if (variant === 'horizontal') {
    return (
      <Link
        to={`/articulo/${article.id}`}
        className="group flex gap-4 items-start hover:bg-slate-50 rounded-lg p-2 -m-2 transition-colors"
      >
        {article.imagen_url && (
          <img
            src={pexelsResize(article.imagen_url, 260)}
            alt={titulo}
            width={260}
            height={200}
            loading="lazy"
            className="w-24 h-24 sm:w-32 sm:h-24 object-cover rounded-lg flex-shrink-0"
          />
        )}
        <div className="min-w-0 flex-1">
          <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">
            {getCategoriaLabel(article.categoria, language)}
          </span>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1 group-hover:text-red-600 transition-colors line-clamp-2 leading-snug">
            {titulo}
          </h3>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {tiempoRelativo(article.publicado_en)}
          </p>
        </div>
      </Link>
    );
  }

  if (variant === 'compact') {
    return (
      <Link
        to={`/articulo/${article.id}`}
        className="group block hover:bg-slate-50 rounded-lg p-2 -m-2 transition-colors"
      >
        <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">
          {getCategoriaLabel(article.categoria, language)}
        </span>
        <h3 className="text-sm font-bold text-slate-900 mt-1 group-hover:text-red-600 transition-colors line-clamp-2 leading-snug">
          {titulo}
        </h3>
        <p className="text-xs text-slate-500 mt-1">{tiempoRelativo(article.publicado_en)}</p>
      </Link>
    );
  }

  return (
    <Link
      to={`/articulo/${article.id}`}
      className="group block bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg hover:border-slate-300 transition-all duration-300"
    >
      {article.imagen_url && (
        <div className="aspect-[16/10] overflow-hidden bg-slate-100">
          <img
            src={pexelsResize(article.imagen_url, 500)}
            alt={titulo}
            width={500}
            height={310}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-red-600 uppercase tracking-wide bg-red-50 px-2 py-0.5 rounded">
            {getCategoriaLabel(article.categoria, language)}
          </span>
          <span className="text-xs text-slate-500">{tiempoRelativo(article.publicado_en)}</span>
        </div>
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-red-600 transition-colors leading-snug line-clamp-3">
          {titulo}
        </h3>
        {article.resumen_seo && (
          <p className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed">{article.resumen_seo}</p>
        )}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500">{language === 'en' ? 'By' : 'Por'} {article.autor}</span>
          {article.fuente_nombre && (
            <span className="text-xs text-slate-500">{language === 'en' ? 'Source' : 'Fuente'}: {article.fuente_nombre}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
