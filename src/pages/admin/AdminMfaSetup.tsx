import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ShieldAlert, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { authApi } from '@/lib/authApi';
import { useAuth } from '@/context/AuthContext';

export default function AdminMfaSetup() {
  const { mfaFactors, mfaLoading, verifyMfa, applyStatus } = useAuth();
  const navigate = useNavigate();

  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const verifiedFactor = mfaFactors.find((f) => f.status === 'verified') ?? null;

  const handleStartEnroll = async () => {
    setError(null);
    setEnrolling(true);
    try {
      // El servidor limpia factores sin verificar de un intento anterior y
      // crea el nuevo (la sesión viaja en la cookie httpOnly).
      const data = await authApi.mfaEnroll();
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setFactorId(data.factorId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar la activación');
      setEnrolling(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId || code.trim().length !== 6) {
      setError('Escribe el código de 6 dígitos de tu app authenticator.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { error: verifyError } = await verifyMfa(code.trim(), factorId);
      if (verifyError) throw new Error(verifyError);
      navigate('/panel-8f3k2qx9/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Código incorrecto. Verifica e intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!verifiedFactor) return;
    if (!window.confirm('¿Quitar la verificación en dos pasos? Tu cuenta quedará protegida solo con la contraseña.')) return;
    setRemoving(true);
    setError(null);
    try {
      applyStatus(await authApi.mfaUnenroll(verifiedFactor.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo quitar la verificación en dos pasos');
    } finally {
      setRemoving(false);
    }
  };

  if (mfaLoading) {
    return <div className="py-16 text-center text-slate-400">Cargando...</div>;
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Verificación en dos pasos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Obligatoria para todos los editores del panel. Usa una app authenticator (Google Authenticator, Authy, etc.).
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {verifiedFactor && !enrolling && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-emerald-700">
            <ShieldCheck className="w-6 h-6" />
            <div>
              <p className="font-semibold">Verificación en dos pasos activa</p>
              <p className="text-sm text-slate-500">Tu cuenta está protegida con contraseña + código TOTP.</p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="flex items-center gap-2 text-sm font-medium text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            {removing ? 'Quitando...' : 'Quitar verificación en dos pasos'}
          </button>
        </div>
      )}

      {!verifiedFactor && !enrolling && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-amber-700">
            <ShieldAlert className="w-6 h-6" />
            <div>
              <p className="font-semibold">Todavía no está activa</p>
              <p className="text-sm text-slate-500">Actívala para poder usar el panel.</p>
            </div>
          </div>
          <button
            onClick={handleStartEnroll}
            className="bg-slate-900 text-white font-semibold px-4 py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Activar verificación en dos pasos
          </button>
        </div>
      )}

      {enrolling && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          {!qrCode ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" /> Generando código QR...
            </div>
          ) : (
            <>
              <div>
                <p className="font-semibold text-slate-900 mb-1">1. Escanea este código</p>
                <p className="text-sm text-slate-500 mb-3">
                  Ábrelo con Google Authenticator, Authy o similar.
                </p>
                <img src={qrCode} alt="Código QR para activar la verificación en dos pasos" className="w-48 h-48 mx-auto" />
                {secret && (
                  <p className="text-xs text-slate-400 text-center mt-3 break-all">
                    ¿No puedes escanear? Código manual: <span className="font-mono">{secret}</span>
                  </p>
                )}
              </div>

              <form onSubmit={handleVerify} className="space-y-3 pt-3 border-t border-slate-100">
                <p className="font-semibold text-slate-900">2. Escribe el código de 6 dígitos</p>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center text-2xl tracking-widest font-mono px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving || code.length !== 6}
                    className="flex-1 bg-slate-900 text-white font-semibold py-2.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Verificando...' : 'Verificar y activar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEnrolling(false); setQrCode(null); setCode(''); }}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
