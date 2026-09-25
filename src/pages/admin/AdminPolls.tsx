import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BarChart3, Plus, Trash2, Power } from 'lucide-react';
import { adminSupabase as supabase } from '@/lib/adminSupabase';
import type { Poll, PollOption } from '@/lib/types';

type Counts = Record<PollOption, number>;

const OPTION_KEYS: PollOption[] = ['a', 'b', 'c'];
const BAR_FILL: Record<PollOption, string> = { a: '#d1d5db', b: '#4b5563', c: '#111111' };

const EMPTY_FORM = { description: '', starts_at: '', ends_at: '' };

function pollStatus(poll: Poll, now: number): { label: string; classes: string } {
  if (!poll.active) return { label: 'Pausada', classes: 'bg-slate-100 text-slate-600' };
  if (now < new Date(poll.starts_at).getTime()) return { label: 'Programada', classes: 'bg-amber-100 text-amber-800' };
  if (now > new Date(poll.ends_at).getTime()) return { label: 'Finalizada', classes: 'bg-slate-200 text-slate-700' };
  return { label: 'Activa', classes: 'bg-emerald-100 text-emerald-800' };
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('es-DO', { dateStyle: 'medium', timeStyle: 'short' });

export default function AdminPolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [counts, setCounts] = useState<Record<string, Counts>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [pollsRes, votesRes] = await Promise.all([
      supabase.from('polls').select('*').order('starts_at', { ascending: false }),
      supabase.from('poll_votes').select('poll_id, option'),
    ]);
    if (pollsRes.error) {
      setError(pollsRes.error.message);
      setLoading(false);
      return;
    }
    const byPoll: Record<string, Counts> = {};
    for (const v of (votesRes.data ?? []) as { poll_id: string; option: PollOption }[]) {
      byPoll[v.poll_id] ??= { a: 0, b: 0, c: 0 };
      byPoll[v.poll_id][v.option] += 1;
    }
    setPolls((pollsRes.data ?? []) as Poll[]);
    setCounts(byPoll);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const start = new Date(form.starts_at);
    const end = new Date(form.ends_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError('Indica la fecha y hora de inicio y de fin.');
      return;
    }
    if (end <= start) {
      setError('La fecha de fin debe ser posterior a la de inicio.');
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from('polls').insert({
      description: form.description.trim(),
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm(EMPTY_FORM);
    load();
  };

  const handleToggle = async (poll: Poll) => {
    setError(null);
    const { error: updateError } = await supabase.from('polls').update({ active: !poll.active }).eq('id', poll.id);
    if (updateError) setError(updateError.message);
    else load();
  };

  const handleDelete = async (poll: Poll) => {
    const votes = counts[poll.id] ? counts[poll.id].a + counts[poll.id].b + counts[poll.id].c : 0;
    const ok = window.confirm(
      `¿Eliminar esta encuesta?\n\n"${poll.description}"\n\nSe borrarán también sus ${votes} voto(s). Esta acción no se puede deshacer.`,
    );
    if (!ok) return;
    setError(null);
    const { error: deleteError } = await supabase.from('polls').delete().eq('id', poll.id);
    if (deleteError) setError(deleteError.message);
    else load();
  };

  const now = Date.now();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Encuestas</h1>
        <p className="text-slate-500 text-sm mt-1">
          La home muestra la encuesta activa dentro de su rango de fechas. Solo votan suscriptores del newsletter, un
          voto por suscriptor.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleCreate} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <h2 className="font-bold text-slate-900 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Nueva encuesta
        </h2>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Descripción</label>
          <textarea
            required
            maxLength={500}
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            placeholder="Ej: ¿Estás de acuerdo con la nueva ley de tránsito?"
          />
          <p className="text-xs text-slate-400 mt-1">
            Opciones fijas: "Estoy de acuerdo", "No estoy de acuerdo", "Estoy indeciso".
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Inicio</label>
            <input
              type="datetime-local"
              required
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Fin</label>
            <input
              type="datetime-local"
              required
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          {saving ? 'Creando...' : 'Crear encuesta'}
        </button>
      </form>

      <div className="space-y-3">
        <h2 className="font-bold text-slate-900">Todas las encuestas</h2>
        {loading ? (
          <p className="text-slate-400 text-sm">Cargando...</p>
        ) : polls.length === 0 ? (
          <p className="text-slate-500 text-sm">Todavía no hay encuestas.</p>
        ) : (
          polls.map((poll) => {
            const status = pollStatus(poll, now);
            const c = counts[poll.id] ?? { a: 0, b: 0, c: 0 };
            const total = c.a + c.b + c.c;
            const labels: Record<PollOption, string> = {
              a: poll.option_a_label,
              b: poll.option_b_label,
              c: poll.option_c_label,
            };
            return (
              <div key={poll.id} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-slate-900 leading-snug">{poll.description}</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${status.classes}`}>
                    {status.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {fmt(poll.starts_at)} → {fmt(poll.ends_at)}
                </p>

                <div className="space-y-2">
                  {OPTION_KEYS.map((k) => {
                    const pct = total > 0 ? Math.round((c[k] * 100) / total) : 0;
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-xs text-slate-600 mb-1">
                          <span>{labels[k]}</span>
                          <span className="font-semibold text-slate-900">
                            {c[k]} · {pct}%
                          </span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                          <svg className="block w-full h-full" role="img" aria-label={`${labels[k]}: ${pct}%`}>
                            <rect x="0" y="0" height="100%" width={`${pct}%`} fill={BAR_FILL[k]} />
                          </svg>
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-xs text-slate-400">{total} voto(s) en total</p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleToggle(poll)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <Power className="w-3.5 h-3.5" />
                    {poll.active ? 'Pausar' : 'Reactivar'}
                  </button>
                  <button
                    onClick={() => handleDelete(poll)}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Eliminar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
