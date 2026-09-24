import { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart3, Check, Link2, Loader2, Share2 } from 'lucide-react';
import type { Poll, PollOption } from '@/lib/types';
import { pollApi, PollApiError, type PollErrorCode, type PollResults } from '@/lib/pollApi';
import { useLanguage } from '@/context/LanguageContext';
import WhatsAppIcon from '@/components/public/WhatsAppIcon';

const STORAGE_KEY = 'poll_subscriber_email';

const OPTIONS: { key: PollOption; en: string; fill: string }[] = [
  { key: 'a', en: 'I agree', fill: '#d1d5db' },
  { key: 'b', en: 'I disagree', fill: '#4b5563' },
  { key: 'c', en: "I'm undecided", fill: '#111111' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readStoredEmail(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeEmail(email: string | null) {
  try {
    if (email) localStorage.setItem(STORAGE_KEY, email);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* sin localStorage: el correo se vuelve a pedir en la próxima visita */
  }
}

const MESSAGES: Record<PollErrorCode, { es: string; en: string }> = {
  invalid_email: { es: 'Escribe un correo válido.', en: 'Enter a valid email.' },
  invalid_request: { es: 'No se pudo procesar la solicitud.', en: 'The request could not be processed.' },
  not_subscribed: {
    es: 'Ese correo no está suscrito. Suscríbete primero para votar.',
    en: 'That email is not subscribed. Subscribe first to vote.',
  },
  poll_closed: { es: 'Esta encuesta ya cerró.', en: 'This poll is closed.' },
  already_voted: { es: 'Ya votaste en esta encuesta.', en: 'You already voted in this poll.' },
  rate_limited: {
    es: 'Demasiados intentos. Espera unos minutos.',
    en: 'Too many attempts. Please wait a few minutes.',
  },
  internal_error: { es: 'Ocurrió un error. Inténtalo de nuevo.', en: 'Something went wrong. Please try again.' },
};

export default function PollWidget({ poll }: { poll: Poll | null }) {
  const { language } = useLanguage();
  const en = language === 'en';

  const [email, setEmail] = useState<string | null>(readStoredEmail);
  const [inputEmail, setInputEmail] = useState('');
  const [selected, setSelected] = useState<PollOption | null>(null);
  // Con correo guardado hay que preguntar si ya votó antes de decidir qué mostrar.
  const [checking, setChecking] = useState<boolean>(() => readStoredEmail() !== null);
  const [results, setResults] = useState<PollResults | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'error' | 'info'; text: string } | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

  const pollId = poll?.id;

  useEffect(() => {
    if (!pollId || !email) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    setChecking(true);
    (async () => {
      try {
        const { voted } = await pollApi.hasVoted(pollId, email);
        if (voted && !cancelled) setResults(await pollApi.results(pollId));
      } catch {
        /* si falla la consulta se muestra la votación; el servidor igual impide el doble voto */
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pollId, email]);

  useEffect(() => {
    if (!shareOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [shareOpen]);

  const fail = useCallback(
    (err: unknown) => {
      const code = err instanceof PollApiError ? err.code : 'internal_error';
      setMessage({ kind: 'error', text: MESSAGES[code][en ? 'en' : 'es'] });
    },
    [en],
  );

  if (!poll) return null;

  const confirmEmail = (value: string) => {
    storeEmail(value);
    setEmail(value);
    setMessage(null);
  };

  const readInputEmail = (): string | null => {
    const value = inputEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setMessage({ kind: 'error', text: MESSAGES.invalid_email[en ? 'en' : 'es'] });
      return null;
    }
    return value;
  };

  const handleSubscribe = async () => {
    const value = readInputEmail();
    if (!value) return;
    setBusy(true);
    setMessage(null);
    try {
      await pollApi.subscribe(value);
      confirmEmail(value);
      setMessage({
        kind: 'info',
        text: en ? 'Subscribed! Now pick an option and confirm your vote.' : '¡Suscrito! Ahora elige una opción y confirma tu voto.',
      });
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const handleAlreadySubscribed = async () => {
    const value = readInputEmail();
    if (!value) return;
    setBusy(true);
    setMessage(null);
    try {
      const { subscribed } = await pollApi.checkSubscribed(value);
      if (subscribed) confirmEmail(value);
      else fail(new PollApiError('not_subscribed'));
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const handleVote = async () => {
    if (!selected || !email) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await pollApi.vote(poll.id, email, selected);
      setResults(res.results);
    } catch (err) {
      if (err instanceof PollApiError && err.code === 'already_voted') {
        try {
          setResults(await pollApi.results(poll.id));
          return;
        } catch {
          /* cae al mensaje de error */
        }
      }
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  const changeEmail = () => {
    storeEmail(null);
    setEmail(null);
    setResults(null);
    setSelected(null);
    setMessage(null);
  };

  const shareUrl = `${window.location.origin}/`;
  const shareText = `${en ? 'Vote in this poll' : 'Vota en esta encuesta'}: ${poll.description} - ${shareUrl}`;

  const labels: Record<PollOption, string> = {
    a: en ? OPTIONS[0].en : poll.option_a_label,
    b: en ? OPTIONS[1].en : poll.option_b_label,
    c: en ? OPTIONS[2].en : poll.option_c_label,
  };

  const shareControl = (
    <div className="relative" ref={shareRef}>
      <button
        type="button"
        onClick={() => setShareOpen((v) => !v)}
        aria-expanded={shareOpen}
        aria-haspopup="true"
        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
      >
        <Share2 className="w-4 h-4" /> {en ? 'Share poll' : 'Compartir encuesta'}
      </button>
      {shareOpen && (
        <div className="absolute z-10 bottom-full mb-2 left-0 w-56 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setShareOpen(false)}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
            {en ? 'Share on WhatsApp' : 'Compartir por WhatsApp'}
          </a>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left border-t border-slate-100"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Link2 className="w-4 h-4 text-slate-500" />}
            {copied ? (en ? 'Link copied' : 'Enlace copiado') : en ? 'Copy link' : 'Copiar link'}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <section className="mb-8" aria-label={en ? 'Poll' : 'Encuesta'}>
      <div className="flex items-center justify-between mb-4 border-b-2 border-brand-blue pb-2">
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-brand-blue" />
          {en ? 'Poll' : 'Encuesta'}
        </h2>
      </div>

      {/* Alto mínimo reservado: el widget cambia entre votar y resultados
          sin correr el resto de la página (CLS). */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 min-h-[30rem] sm:min-h-[24rem] flex flex-col">
        <p className="text-lg sm:text-xl font-semibold text-slate-900 leading-snug mb-5">{poll.description}</p>

        {checking ? (
          <div className="flex-1 flex items-center justify-center text-slate-400" role="status">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : results ? (
          <div className="flex-1 space-y-4">
            {OPTIONS.map((opt) => (
              <div key={opt.key}>
                <div className="flex items-baseline justify-between text-sm mb-1.5">
                  <span className="font-medium text-slate-700">{labels[opt.key]}</span>
                  <span className="font-bold text-slate-900">{results[opt.key].percent}%</span>
                </div>
                <div className="h-4 w-full rounded-full bg-slate-100 overflow-hidden">
                  <svg
                    className="block w-full h-full"
                    role="img"
                    aria-label={`${labels[opt.key]}: ${results[opt.key].percent}%`}
                  >
                    <rect x="0" y="0" height="100%" width={`${results[opt.key].percent}%`} fill={opt.fill} />
                  </svg>
                </div>
              </div>
            ))}
            <p className="text-xs text-slate-500 pt-1">
              {en
                ? `${results.total} ${results.total === 1 ? 'vote' : 'votes'} · Thanks for voting!`
                : `${results.total} ${results.total === 1 ? 'voto' : 'votos'} · ¡Gracias por votar!`}
            </p>
          </div>
        ) : (
          <div className="flex-1 space-y-4">
            <div role="radiogroup" className="space-y-2">
              {OPTIONS.map((opt) => (
                <label
                  key={opt.key}
                  className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm sm:text-base transition-colors ${
                    email ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60 cursor-not-allowed'
                  } ${selected === opt.key ? 'border-brand-blue bg-slate-50' : 'border-slate-200'}`}
                >
                  <input
                    type="radio"
                    name={`poll-${poll.id}`}
                    value={opt.key}
                    disabled={!email || busy}
                    checked={selected === opt.key}
                    onChange={() => setSelected(opt.key)}
                    className="w-4 h-4 accent-brand-blue"
                  />
                  <span className="font-medium text-slate-800">{labels[opt.key]}</span>
                </label>
              ))}
            </div>

            {email ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <button
                  type="button"
                  onClick={handleVote}
                  disabled={!selected || busy}
                  className="bg-brand-red hover:bg-brand-red-dark text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {busy ? (en ? 'Sending...' : 'Enviando...') : en ? 'Confirm vote' : 'Confirmar voto'}
                </button>
                <p className="text-xs text-slate-500 break-all">
                  {en ? 'Voting as' : 'Votando como'} <span className="font-medium">{email}</span> ·{' '}
                  <button type="button" onClick={changeEmail} className="underline hover:text-slate-800">
                    {en ? 'change' : 'cambiar'}
                  </button>
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-600">
                  {en
                    ? 'Only subscribers can vote (one vote per subscriber).'
                    : 'Solo pueden votar los suscriptores (un voto por suscriptor).'}
                </p>
                <input
                  type="email"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  placeholder={en ? 'you@email.com' : 'tu@correo.com'}
                  aria-label={en ? 'Email' : 'Correo electrónico'}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-brand-blue"
                />
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleSubscribe}
                    disabled={busy}
                    className="bg-brand-red hover:bg-brand-red-dark text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {en ? 'Subscribe to the site' : 'Suscribirse a la página'}
                  </button>
                  <button
                    type="button"
                    onClick={handleAlreadySubscribed}
                    disabled={busy}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
                  >
                    {en ? "I'm already subscribed" : 'Ya estoy suscrito'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {message && (
          <p
            role={message.kind === 'error' ? 'alert' : 'status'}
            className={`text-sm mt-3 ${message.kind === 'error' ? 'text-red-600' : 'text-emerald-700'}`}
          >
            {message.text}
          </p>
        )}

        <div className="mt-5 pt-4 border-t border-slate-100">{shareControl}</div>
      </div>
    </section>
  );
}
