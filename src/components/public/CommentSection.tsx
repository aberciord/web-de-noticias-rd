import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Send, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { adminSupabase } from '@/lib/adminSupabase';
import { useAuth } from '@/context/AuthContext';
import { tiempoRelativo } from '@/lib/format';
import type { Comment } from '@/lib/types';

const BANNED_WORDS = [
  'puta', 'puto', 'puto', 'cabron', 'cabrón', 'imbecil', 'imbécil',
  'idiota', 'pendejo', 'mamabicho', 'come mierda', 'comemierda',
  'coño', 'mierda', 'carajo', 'pinga', 'charro',
  'asshole', 'bitch', 'fuck', 'shit', 'damn',
];

function containsBannedWord(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}`, 'i');
    return regex.test(lower);
  });
}

interface CommentSectionProps {
  articleId: string;
}

export default function CommentSection({ articleId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const loadComments = useCallback(() => {
    supabase
      .from('comments')
      .select('*')
      .eq('article_id', articleId)
      .order('creado_en', { ascending: false })
      .then(({ data }) => {
        setComments(data as Comment[] ?? []);
        setLoading(false);
      });
  }, [articleId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    const trimmed = commentText.trim();
    if (!trimmed) return;
    if (trimmed.length > 500) {
      setError('El comentario no puede exceder 500 caracteres.');
      return;
    }
    if (containsBannedWord(trimmed)) {
      setError('Tu comentario contiene lenguaje inapropiado. Por favor, revísalo.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const autorNombre = user.email?.split('@')[0] ?? 'Usuario';

    const { error: insertError } = await adminSupabase.from('comments').insert({
      article_id: articleId,
      autor_nombre: autorNombre,
      contenido: trimmed,
    });

    setSubmitting(false);

    if (insertError) {
      setError('No se pudo publicar el comentario. Inténtalo de nuevo.');
      return;
    }

    setCommentText('');
    loadComments();
  };

  const handleDelete = async (commentId: number) => {
    const { error: deleteError } = await adminSupabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (!deleteError) {
      loadComments();
    }
  };

  return (
    <section className="mt-10 pt-8 border-t border-slate-200">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-slate-700" />
        <h2 className="text-lg font-bold text-slate-900">
          Comentarios ({comments.length})
        </h2>
      </div>

      {/* Comment form */}
      {user ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Escribe un comentario..."
            rows={3}
            maxLength={500}
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-colors resize-none"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-slate-500">{commentText.length}/500</span>
            <button
              type="submit"
              disabled={submitting || !commentText.trim()}
              className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-blue-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Publicar
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
          {showLoginPrompt ? (
            <p className="text-sm text-slate-600">
              Debes iniciar sesión para comentar. Si eres editor, usa el acceso del panel.
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              Inicia sesión para participar en la conversación.
            </p>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Comments list */}
      {loading ? (
        <p className="text-sm text-slate-500 text-center py-6">Cargando comentarios...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          Sé el primero en comentar.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="flex gap-3 p-4 bg-white border border-slate-200 rounded-lg"
            >
              <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-slate-600 uppercase">
                  {comment.autor_nombre.charAt(0)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {comment.autor_nombre}
                    </span>
                    <span className="text-xs text-slate-500">
                      {tiempoRelativo(comment.creado_en)}
                    </span>
                  </div>
                  {user?.id === comment.user_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                      aria-label="Eliminar comentario"
                      title="Eliminar comentario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed break-words">
                  {comment.contenido}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
