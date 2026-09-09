import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { CATEGORIAS } from '@/lib/types';
import type { Article, Categoria } from '@/lib/types';
import ArticleCard from '@/components/public/ArticleCard';
import { tiempoRelativo } from '@/lib/format';

interface HomePageProps {
  articles: Article[];
}

export default function HomePage({ articles }: HomePageProps) {
  const featured = articles[0];
  const secondary = articles.slice(1, 3);
  const rest = articles.slice(3);

  if (!featured) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">No hay artículos publicados aún.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero section */}
      <section className="mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Featured article */}
          <Link
            to={`/articulo/${featured.id}`}
            className="lg:col-span-2 group block relative rounded-2xl overflow-hidden bg-slate-900 aspect-[16/10] lg:aspect-auto"
          >
            {featured.imagen_url && (
              <img
                src={featured.imagen_url}
                alt={featured.titulo_es}
                className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
            <div className="relative h-full flex flex-col justify-end p-6 sm:p-8">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-white bg-red-600 px-3 py-1 rounded-full uppercase tracking-wide">
                  {CATEGORIAS.find((c) => c.value === featured.categoria)?.label}
                </span>
                <span className="text-xs text-slate-300">{tiempoRelativo(featured.publicado_en)}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight group-hover:text-red-100 transition-colors">
                {featured.titulo_es}
              </h2>
              {featured.resumen_seo && (
                <p className="text-slate-300 mt-3 text-sm sm:text-base line-clamp-2 max-w-2xl leading-relaxed">
                  {featured.resumen_seo}
                </p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm text-slate-400">
                <span>Por {featured.autor}</span>
                {featured.fuente_nombre && <span>Fuente: {featured.fuente_nombre}</span>}
              </div>
            </div>
          </Link>

          {/* Secondary articles */}
          <div className="space-y-4 lg:border-l lg:border-slate-200 lg:pl-6">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider hidden lg:block">
              Lo más reciente
            </h3>
            {secondary.map((article) => (
              <ArticleCard key={article.id} article={article} variant="horizontal" />
            ))}
          </div>
        </div>
      </section>

      {/* Category navigation */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-4">
        <span className="text-sm font-semibold text-slate-500 py-1.5">Explorar:</span>
        {CATEGORIAS.map((cat) => (
          <Link
            key={cat.value}
            to={`/categoria/${cat.value}`}
            className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-900 hover:text-white transition-colors"
          >
            {cat.label}
          </Link>
        ))}
      </div>

      {/* Articles grid */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Más noticias</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </section>

      {/* Category sections */}
      {CATEGORIAS.map((cat) => {
        const catArticles = articles.filter((a) => a.categoria === cat.value).slice(0, 4);
        if (catArticles.length === 0) return null;
        return (
          <CategorySection key={cat.value} categoria={cat.value} articles={catArticles} />
        );
      })}
    </div>
  );
}

function CategorySection({ categoria, articles }: { categoria: Categoria; articles: Article[] }) {
  const cat = CATEGORIAS.find((c) => c.value === categoria)!;
  const main = articles[0];
  const side = articles.slice(1);

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4 border-b-2 border-slate-900 pb-2">
        <h2 className="text-xl font-bold text-slate-900">{cat.label}</h2>
        <Link
          to={`/categoria/${categoria}`}
          className="flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
        >
          Ver más <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ArticleCard article={main} />
        <div className="space-y-4">
          {side.map((article) => (
            <ArticleCard key={article.id} article={article} variant="horizontal" />
          ))}
        </div>
      </div>
    </section>
  );
}
