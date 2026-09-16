import { useState } from 'react';
import { UserPlus, Mail, Lock, ShieldQuestion, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const EMPTY_FORM = {
  email: '',
  password: '',
  question_1: '',
  answer_1: '',
  question_2: '',
  answer_2: '',
};

const EMPTY_OWN_QUESTIONS = { question_1: '', answer_1: '', question_2: '', answer_2: '', new_password: '' };

export default function EditorsManager() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [ownQuestions, setOwnQuestions] = useState(EMPTY_OWN_QUESTIONS);
  const [savingOwn, setSavingOwn] = useState(false);
  const [ownError, setOwnError] = useState<string | null>(null);
  const [ownSuccess, setOwnSuccess] = useState(false);

  const handleSaveOwnQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnError(null);
    setOwnSuccess(false);
    setSavingOwn(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-editors`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify({ action: 'set_own_questions', ...ownQuestions }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Error ${response.status}`);

      setOwnSuccess(true);
      setOwnQuestions(EMPTY_OWN_QUESTIONS);
    } catch (err) {
      setOwnError(err instanceof Error ? err.message : 'No se pudieron guardar las preguntas');
    } finally {
      setSavingOwn(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-editors`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}`);
      }

      setSuccess(true);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el editor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Editores</h1>
        <p className="text-slate-500 text-sm mt-1">
          Crea acceso al panel para un nuevo editor. Solo tú, ya con sesión iniciada, puedes hacerlo —
          no existe registro público.
        </p>
      </div>

      <form onSubmit={handleSaveOwnQuestions} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <h2 className="font-bold text-slate-900 flex items-center gap-1.5">
            <ShieldQuestion className="w-4 h-4" />
            Mis preguntas de seguridad
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Se usan para recuperar tu contraseña si la olvidas. Guardar aquí reemplaza las anteriores.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Pregunta 1</label>
          <input
            type="text"
            required
            value={ownQuestions.question_1}
            onChange={(e) => setOwnQuestions({ ...ownQuestions, question_1: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none mb-1.5"
            placeholder="Ej: ¿Nombre de tu primera mascota?"
          />
          <input
            type="text"
            required
            value={ownQuestions.answer_1}
            onChange={(e) => setOwnQuestions({ ...ownQuestions, answer_1: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            placeholder="Respuesta"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Pregunta 2</label>
          <input
            type="text"
            required
            value={ownQuestions.question_2}
            onChange={(e) => setOwnQuestions({ ...ownQuestions, question_2: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none mb-1.5"
            placeholder="Ej: ¿Ciudad donde naciste?"
          />
          <input
            type="text"
            required
            value={ownQuestions.answer_2}
            onChange={(e) => setOwnQuestions({ ...ownQuestions, answer_2: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            placeholder="Respuesta"
          />
        </div>

        <div className="pt-2 border-t border-slate-100">
          <label className="block text-xs font-medium text-slate-600 mb-1">Nueva contraseña (opcional)</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              minLength={6}
              value={ownQuestions.new_password}
              onChange={(e) => setOwnQuestions({ ...ownQuestions, new_password: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              placeholder="Déjalo vacío para no cambiarla"
            />
          </div>
        </div>

        {ownError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{ownError}</p>
          </div>
        )}
        {ownSuccess && (
          <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800">Preguntas guardadas.</p>
          </div>
        )}

        <button
          type="submit"
          disabled={savingOwn}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <ShieldQuestion className="w-4 h-4" />
          {savingOwn ? 'Guardando...' : 'Guardar mis preguntas'}
        </button>
      </form>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div>
          <h2 className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
            <UserPlus className="w-4 h-4" />
            Nuevo editor
          </h2>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo electrónico</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              placeholder="nuevo.editor@correo.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña inicial</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100">
          <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-1.5">
            <ShieldQuestion className="w-4 h-4" />
            Preguntas de seguridad (para recuperar la contraseña)
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Pregunta 1</label>
              <input
                type="text"
                required
                value={form.question_1}
                onChange={(e) => setForm({ ...form, question_1: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none mb-1.5"
                placeholder="Ej: ¿Nombre de tu primera mascota?"
              />
              <input
                type="text"
                required
                value={form.answer_1}
                onChange={(e) => setForm({ ...form, answer_1: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="Respuesta"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Pregunta 2</label>
              <input
                type="text"
                required
                value={form.question_2}
                onChange={(e) => setForm({ ...form, question_2: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none mb-1.5"
                placeholder="Ej: ¿Ciudad donde naciste?"
              />
              <input
                type="text"
                required
                value={form.answer_2}
                onChange={(e) => setForm({ ...form, answer_2: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="Respuesta"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-800">Editor creado. Ya puede iniciar sesión con ese correo y contraseña.</p>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          {saving ? 'Creando...' : 'Crear editor'}
        </button>
      </form>
    </div>
  );
}
