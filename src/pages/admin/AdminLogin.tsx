import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Newspaper, Mail, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AdminLogin() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
              <Newspaper className="w-7 h-7 text-slate-900" />
            </div>
          </Link>
          <h1 className="text-2xl font-bold text-white">Panel Editorial</h1>
          <p className="text-slate-400 text-sm mt-1">NoticiasRD — Acceso para editores</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex gap-2 mb-6 bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => { setMode('signin'); setError(null); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                mode === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${
                mode === 'signup' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Crear cuenta
            </button>
          </div>

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
                  placeholder="editor@noticiasrd.do"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Contraseña</label>
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
              {loading ? 'Procesando...' : mode === 'signin' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>

          <Link to="/" className="block text-center text-sm text-slate-500 hover:text-slate-900 mt-6 transition-colors">
            ← Volver al sitio
          </Link>
        </div>
      </div>
    </div>
  );
}
