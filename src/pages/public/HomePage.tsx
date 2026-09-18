import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CATEGORIAS } from '@/lib/types';
import type { Article, Categoria } from '@/lib/types';
import ArticleCard from '@/components/public/ArticleCard';
import YoutubeLiveSection from '@/components/public/YoutubeLiveSection';
import { tiempoRelativo } from '@/lib/format';
import { useLanguage } from '@/context/LanguageContext';
import { pexelsResize } from '@/lib/imageOptimize';

interface HomePageProps {
  articles: Article[];
}

export default function HomePage({ articles }: HomePageProps) {
  const { language } = useLanguage();
  const featured = articles[0];
  // "Lo más reciente" solo muestra artículos de la MISMA categoría que el
  // destacado — nunca mezclamos categorías dentro de un mismo renglón.
  const secondary = featured
    ? articles.filter((a) => a.categoria === featured.categoria && a.id !== featured.id).slice(0, 2)
    : [];

  if (!featured) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">
          {language === 'en' ? 'No articles published yet.' : 'No hay artículos publicados aún.'}
        </p>
      </div>
    );
  }

  const featuredTitulo = language === 'en' ? featured.titulo_en : featured.titulo_es;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="sr-only">El poder del pueblo RD — {language === 'en' ? 'Dominican news portal' : 'Portal de noticias dominicano'}</h1>
      {/* Hero section */}
      <section className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Featured article */}
          <Link
            to={`/articulo/${featured.id}`}
            className="lg:col-span-2 group block relative rounded-2xl overflow-hidden bg-brand-blue-dark aspect-[16/10] lg:aspect-auto"
          >
            {featured.imagen_url && (
              <img
                src={pexelsResize(featured.imagen_url, 1200)}
                alt={featuredTitulo}
                width={1200}
                height={750}
                loading="eager"
                fetchPriority="high"
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-brand-blue-dark via-brand-blue-dark/60 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-white bg-brand-red px-3 py-1 rounded-full uppercase tracking-wide">
                  {language === 'en'
                    ? CATEGORIAS.find((c) => c.value === featured.categoria)?.labelEn
                    : CATEGORIAS.find((c) => c.value === featured.categoria)?.label}
                </span>
                <span className="text-xs text-slate-300">{tiempoRelativo(featured.publicado_en)}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight group-hover:text-red-100 transition-colors">
                {featuredTitulo}
              </h2>
              {featured.resumen_seo && (
                <p className="text-slate-300 mt-3 text-sm sm:text-base line-clamp-2 max-w-2xl leading-relaxed">
                  {featured.resumen_seo}
                </p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
                <span>{language === 'en' ? 'By' : 'Por'} {featured.autor}</span>
                {featured.fuente_nombre && (
                  <span>{language === 'en' ? 'Source' : 'Fuente'}: {featured.fuente_nombre}</span>
                )}
              </div>
            </div>
          </Link>

          {/* Secondary articles */}
          <div className="space-y-4 lg:border-l lg:border-slate-200 lg:pl-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider hidden lg:block">
              {language === 'en' ? 'Latest' : 'Lo más reciente'}
            </h3>
            {secondary.map((article) => (
              <ArticleCard key={article.id} article={article} variant="horizontal" />
            ))}
          </div>
        </div>
      </section>

      {/* Category navigation */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-slate-200 pb-4">
        <span className="text-sm font-semibold text-slate-500 py-1.5">
          {language === 'en' ? 'Explore:' : 'Explorar:'}
        </span>
        {CATEGORIAS.map((cat) => (
          <Link
            key={cat.value}
            to={`/categoria/${cat.value}`}
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 hover:bg-brand-blue hover:text-white transition-colors"
          >
            {language === 'en' ? cat.labelEn : cat.label}
          </Link>
        ))}
      </div>

      <div className="mb-10">
        <YoutubeLiveSection />
      </div>

      {/* Category sections — cada una muestra articulos de UNA sola categoria,
          minimo 6 cuando el pipeline ya acumulo suficientes notas, con el
          mas reciente (el de mayor relevancia) destacado en grande */}
      {CATEGORIAS.map((cat) => {
        const catArticles = articles.filter((a) => a.categoria === cat.value).slice(0, 6);
        if (catArticles.length === 0) return null;
        return (
          <CategorySection key={cat.value} categoria={cat.value} articles={catArticles} />
        );
      })}
    </div>
  );
}

function CategorySection({ categoria, articles }: { categoria: Categoria; articles: Article[] }) {
  const { language } = useLanguage();
  const cat = CATEGORIAS.find((c) => c.value === categoria)!;
  const main = articles[0];
  const rest = articles.slice(1);
  const mainTitulo = language === 'en' ? main.titulo_en : main.titulo_es;

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4 border-b-2 border-brand-blue pb-2">
        <h2 className="text-xl font-bold text-slate-900">{language === 'en' ? cat.labelEn : cat.label}</h2>
        <Link
          to={`/categoria/${categoria}`}
          aria-label={`${language === 'en' ? 'See more' : 'Ver más'} — ${language === 'en' ? cat.labelEn : cat.label}`}
          className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
        >
          {language === 'en' ? 'See more' : 'Ver más'} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* El más relevante (más reciente) destacado en grande */}
      <Link
        to={`/articulo/${main.id}`}
        className="group block relative rounded-2xl overflow-hidden bg-brand-blue-dark aspect-[21/9] sm:aspect-[3/1] mb-4"
      >
        {main.imagen_url && (
          <img
            src={pexelsResize(main.imagen_url, 1000)}
            alt={mainTitulo}
            width={1000}
            height={330}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-blue-dark via-brand-blue-dark/50 to-transparent" />
        <div className="relative h-full flex flex-col justify-end p-5 sm:p-7">
          <span className="text-xs text-slate-300 mb-1.5">{tiempoRelativo(main.publicado_en)}</span>
          <h3 className="text-lg sm:text-2xl font-bold text-white leading-tight group-hover:text-red-100 transition-colors line-clamp-2">
            {mainTitulo}
          </h3>
        </div>
      </Link>

      {/* Resto de la categoria, en tamaño estándar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {rest.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
