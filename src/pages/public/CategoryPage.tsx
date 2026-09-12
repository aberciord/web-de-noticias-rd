import { useParams } from 'react-router-dom';
import { CATEGORIAS } from '@/lib/types';
import type { Article } from '@/lib/types';
import ArticleCard from '@/components/public/ArticleCard';
import { useLanguage } from '@/context/LanguageContext';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

interface CategoryPageProps {
  articles: Article[];
}

export default function CategoryPage({ articles }: CategoryPageProps) {
  const { categoria } = useParams<{ categoria: string }>();
  const { language } = useLanguage();
  const cat = CATEGORIAS.find((c) => c.value === categoria);

  useDocumentMeta({
    title: cat
      ? `${language === 'en' ? cat.labelEn : cat.label} — El poder del pueblo RD`
      : 'El poder del pueblo RD',
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
