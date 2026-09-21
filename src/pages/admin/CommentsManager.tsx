import { useState, useEffect } from 'react';
import { MessageCircle, Trash2, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getCategoriaLabel } from '@/lib/types';
import type { Comment, Article } from '@/lib/types';
import { tiempoRelativo } from '@/lib/format';

interface CommentWithArticle extends Comment {
  articles?: Pick<Article, 'titulo_es' | 'categoria'>;
}

export default function CommentsManager() {
  const [comments, setComments] = useState<CommentWithArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterArticle, setFilterArticle] = useState<string>('all');

  useEffect(() => {
    loadComments();
  }, []);

  const loadComments = () => {
    setLoading(true);
    supabase
      .from('comments')
      .select('*, articles(titulo_es, categoria)')
      .order('creado_en', { ascending: false })
      .then(({ data }) => {
        setComments((data as CommentWithArticle[]) ?? []);
        setLoading(false);
      });
  };

  const handleDelete = async (commentId: number) => {
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    }
  };

  const filtered = comments.filter((c) => {
    const matchesSearch =
      !searchTerm ||
      c.contenido.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.autor_nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArticle = filterArticle === 'all' || c.article_id === filterArticle;
    return matchesSearch && matchesArticle;
  });

  const articleOptions = comments.reduce((acc, c) => {
    if (!acc.find((a) => a.id === c.article_id)) {
      acc.push({
        id: c.article_id,
        titulo: c.articles?.titulo_es ?? 'Artículo eliminado',
      });
    }
    return acc;
  }, [] as { id: string; titulo: string }[]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Moderación de comentarios</h1>
        <p className="text-slate-500 text-sm mt-1">
          Revisa y elimina comentarios inapropiados del sitio público.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por contenido o autor..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-colors"
          />
        </div>
        <select
          value={filterArticle}
          onChange={(e) => setFilterArticle(e.target.value)}
          className="px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-colors bg-white"
        >
          <option value="all">Todos los artículos</option>
          {articleOptions.map((art) => (
            <option key={art.id} value={art.id}>
              {art.titulo.substring(0, 50)}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <MessageCircle className="w-4 h-4" />
        {filtered.length} comentario{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No hay comentarios para mostrar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((comment) => (
            <div
              key={comment.id}
              className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-600 uppercase">
                  {comment.autor_nombre.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-slate-900">
                    {comment.autor_nombre}
                  </span>
                  <span className="text-xs text-slate-400">
                    {tiempoRelativo(comment.creado_en)}
                  </span>
                </div>
                {comment.articles && (
                  <p className="text-xs text-slate-500 mb-2">
                    En: <span className="font-medium">{comment.articles.titulo_es}</span>
                    {comment.articles.categoria && (
                      <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {getCategoriaLabel(comment.articles.categoria)}
                      </span>
                    )}
                  </p>
                )}
                <p className="text-sm text-slate-700 leading-relaxed break-words">
                  {comment.contenido}
                </p>
              </div>
              <button
                onClick={() => handleDelete(comment.id)}
                className="flex-shrink-0 self-start w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Eliminar comentario"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
