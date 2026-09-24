import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type Mode = 'signin' | 'mfa_verify' | 'forgot_email' | 'forgot_questions' | 'forgot_done';

export default function AdminLogin() {
  const { signIn, user, loading: authLoading, aal, mfaLoading, refreshMfa } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('signin');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    if (authLoading || mfaLoading || !user) return;
    // Si ya inició sesión pero le falta subir a aal2 (tiene 2FA activo y aún
    // no lo verificó en esta sesión), se le pide el código antes de entrar.
    if (aal && aal.next === 'aal2' && aal.current !== 'aal2') {
      if (mode !== 'mfa_verify') {
        supabase.auth.mfa.listFactors().then(({ data }) => {
          const factor = data?.totp.find((f) => f.status === 'verified');
          if (factor) {
            setMfaFactorId(factor.id);
            setMode('mfa_verify');
          }
        });
      }
      return;
    }
    navigate('/panel-8f3k2qx9/dashboard');
  }, [authLoading, mfaLoading, user, aal, mode, navigate]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [questions, setQuestions] = useState<{ question_1: string; question_2: string } | null>(null);
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetPasswordApi = async (body: Record<string, string>) => {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password-questions`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn(email, password);

    setLoading(false);

    // Si necesita 2FA, el efecto de arriba lo manda a mfa_verify; si no,
    // lo manda directo al dashboard. Aquí solo se muestra el error, si hubo.
    if (result.error) {
      setError(result.error);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaFactorId || mfaCode.trim().length !== 6) {
      setError('Escribe el código de 6 dígitos de tu app authenticator.');
      return;
    }
    setError(null);
    setLoading(true);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactorId,
      code: mfaCode.trim(),
    });
    setLoading(false);
    if (verifyError) {
      setError('Código incorrecto. Verifica e intenta de nuevo.');
      setMfaCode('');
      return;
    }
    await refreshMfa();
    navigate('/panel-8f3k2qx9/dashboard');
  };

  const handleGetQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await resetPasswordApi({ action: 'get_questions', email });
      setQuestions({ question_1: data.question_1, question_2: data.question_2 });
      setMode('forgot_questions');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo continuar');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await resetPasswordApi({
        action: 'verify_and_reset',
        email,
        answer_1: answer1,
        answer_2: answer2,
        new_password: newPassword,
      });
      setMode('forgot_done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError(null);
    setQuestions(null);
    setAnswer1('');
    setAnswer2('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/logo.png" alt="El poder del pueblo RD" className="h-20 w-20 rounded-xl bg-white object-contain p-1.5" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Panel Editorial</h1>
          <p className="text-slate-400 text-sm mt-1">El poder del pueblo RD — Acceso para editores</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {mode === 'signin' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                    placeholder="editor@elpoderdelpueblord.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot_email')}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Procesando...' : 'Iniciar sesión'}
              </button>
            </form>
          )}

          {mode === 'mfa_verify' && (
            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900">
                <ShieldCheck className="w-5 h-5" />
                <h2 className="font-bold">Verificación en dos pasos</h2>
              </div>
              <p className="text-sm text-slate-500">
                Escribe el código de 6 dígitos de tu app authenticator.
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                className="w-full text-center text-2xl tracking-widest font-mono px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              />

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || mfaCode.length !== 6}
                className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {loading ? 'Verificando...' : 'Verificar'}
              </button>
            </form>
          )}

          {mode === 'forgot_email' && (
            <div className="space-y-4">
              <div>
                <h2 className="font-bold text-slate-900">Recuperar contraseña</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Escribe tu correo. Si tiene preguntas de seguridad configuradas, te las mostraremos.
                </p>
              </div>

              <form onSubmit={handleGetQuestions} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Correo electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                      placeholder="editor@elpoderdelpueblord.com"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Buscando...' : 'Continuar'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="block w-full text-center text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                ← Volver a iniciar sesión
              </button>
            </div>
          )}

          {mode === 'forgot_questions' && questions && (
            <div className="space-y-4">
              <div>
                <h2 className="font-bold text-slate-900">Responde tus preguntas de seguridad</h2>
                <p className="text-sm text-slate-500 mt-1">Luego elige tu nueva contraseña.</p>
              </div>

              <form onSubmit={handleVerifyAndReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{questions.question_1}</label>
                  <input
                    type="text"
                    required
                    value={answer1}
                    onChange={(e) => setAnswer1(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{questions.question_2}</label>
                  <input
                    type="text"
                    required
                    value={answer2}
                    onChange={(e) => setAnswer2(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  />
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nueva contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="block w-full text-center text-sm text-slate-500 hover:text-slate-900 transition-colors"
              >
                ← Volver a iniciar sesión
              </button>
            </div>
          )}

          {mode === 'forgot_done' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800">Contraseña actualizada. Ya puedes iniciar sesión con la nueva.</p>
              </div>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="w-full bg-slate-900 text-white font-semibold py-3 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Ir a iniciar sesión
              </button>
            </div>
          )}

          <Link to="/" className="block text-center text-sm text-slate-500 hover:text-slate-900 mt-6 transition-colors">
            ← Volver al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}
