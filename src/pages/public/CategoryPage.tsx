import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CATEGORIAS } from '@/lib/types';
import type { Article } from '@/lib/types';
import ArticleCard from '@/components/public/ArticleCard';
import { useLanguage } from '@/context/LanguageContext';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

interface CategoryPageProps {
  articles: Article[];
}

const PAGE_SIZE = 12;

export default function CategoryPage({ articles }: CategoryPageProps) {
  const { categoria } = useParams<{ categoria: string }>();
  const { language } = useLanguage();
  const cat = CATEGORIAS.find((c) => c.value === categoria);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [categoria]);

  useDocumentMeta({
    title: cat
      ? `${language === 'en' ? cat.labelEn : cat.label} — El poder del pueblo RD`
      : 'El poder del pueblo RD',
    canonical: categoria ? `https://elpoderdelpueblord.com/categoria/${categoria}` : undefined,
  });

  if (!cat) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-slate-500">
          {language === 'en' ? 'Category not found.' : 'Categoría no encontrada.'}
        </p>
      </div>
    );
  }

  const filtered = articles.filter((a) => a.categoria === cat.value);
  const catLabel = language === 'en' ? cat.labelEn : cat.label;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageArticles = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const goToPage = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-8 border-b-2 border-brand-blue pb-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">{catLabel}</h1>
        <p className="text-slate-500 mt-2">
          {language === 'en'
            ? `${filtered.length} ${filtered.length === 1 ? 'article' : 'articles'} published`
            : `${filtered.length} ${filtered.length === 1 ? 'artículo' : 'artículos'} publicados`}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-slate-500">
            {language === 'en' ? 'No articles published in this category yet.' : 'No hay artículos publicados en esta categoría.'}
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="font-heading text-lg font-bold text-slate-900">
              {language === 'en' ? 'Archive' : 'Historial'}
            </h2>
            <span className="text-sm text-slate-500">
              {language === 'en'
                ? `Page ${currentPage} of ${totalPages}`
                : `Página ${currentPage} de ${totalPages}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {pageArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {language === 'en' ? 'Previous' : 'Anterior'}
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      p === currentPage
                        ? 'bg-brand-blue text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                {language === 'en' ? 'Next' : 'Siguiente'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
