import { useState } from 'react';
import { Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';

export default function NewsletterSignup() {
  const { language } = useLanguage();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('loading');

    const { error } = await supabase.from('newsletter_subscribers').insert({ email: email.trim().toLowerCase() });

    if (error) {
      setStatus(error.code === '23505' ? 'success' : 'error');
    } else {
      setStatus('success');
    }
  };

  return (
    <div className="bg-brand-blue rounded-2xl px-6 py-8 sm:px-10 sm:py-10">
      <div className="max-w-2xl mx-auto text-center">
        <Mail className="w-8 h-8 text-white/80 mx-auto mb-3" />
        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white">
          {language === 'en' ? 'Never miss a story' : 'No te pierdas ninguna noticia'}
        </h2>
        <p className="text-blue-100 mt-2 mb-6 text-sm sm:text-base">
          {language === 'en'
            ? 'Subscribe to get the top Dominican news straight to your inbox.'
            : 'Suscríbete y recibe las noticias más importantes de República Dominicana en tu correo.'}
        </p>

        {status === 'success' ? (
          <div className="flex items-center justify-center gap-2 bg-white/10 text-white rounded-lg py-3 px-4 text-sm font-medium">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            {language === 'en' ? "You're subscribed. Thank you!" : '¡Ya estás suscrito! Gracias.'}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={language === 'en' ? 'you@email.com' : 'tu@correo.com'}
              className="flex-1 px-4 py-3 rounded-lg text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-red"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-brand-red hover:bg-brand-red-dark text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-60"
            >
              {status === 'loading'
                ? (language === 'en' ? 'Sending...' : 'Enviando...')
                : (language === 'en' ? 'Subscribe' : 'Suscribirme')}
            </button>
          </form>
        )}

        {status === 'error' && (
          <div className="flex items-center justify-center gap-2 mt-3 text-red-200 text-sm">
            <AlertCircle className="w-4 h-4" />
            {language === 'en' ? 'Something went wrong. Try again.' : 'Algo salió mal. Intenta de nuevo.'}
          </div>
        )}
      </div>
    </div>
  );
}
