import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LanguageProvider } from '@/context/LanguageContext';
import PublicLayout from '@/components/public/PublicLayout';
import HomePage from '@/pages/public/HomePage';
import CategoryPage from '@/pages/public/CategoryPage';
import ArticlePage from '@/pages/public/ArticlePage';
import AboutPage from '@/pages/public/AboutPage';
import PrivacyPolicyPage from '@/pages/public/PrivacyPolicyPage';
import TermsOfUsePage from '@/pages/public/TermsOfUsePage';
import { lazy, Suspense, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ArticleListItem, Poll } from '@/lib/types';

// El panel de administración se carga aparte (code-splitting): los
// visitantes del sitio público nunca descargan este JS.
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('@/components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const ReviewQueue = lazy(() => import('@/pages/admin/ReviewQueue'));
const ArticleEditor = lazy(() => import('@/pages/admin/ArticleEditor'));
const SourcesManager = lazy(() => import('@/pages/admin/SourcesManager'));
const BannersManager = lazy(() => import('@/pages/admin/BannersManager'));
const CommentsManager = lazy(() => import('@/pages/admin/CommentsManager'));
const EditorsManager = lazy(() => import('@/pages/admin/EditorsManager'));
const AdminMfaSetup = lazy(() => import('@/pages/admin/AdminMfaSetup'));
const AdminPolls = lazy(() => import('@/pages/admin/AdminPolls'));

function AdminLoadingFallback() {
  return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, aal, mfaLoading } = useAuth();
  const [checkingEditor, setCheckingEditor] = useState(true);
  const [isEditor, setIsEditor] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsEditor(false);
      setCheckingEditor(false);
      return;
    }
    setCheckingEditor(true);
    supabase
      .from('editors')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setIsEditor(!!data);
        setCheckingEditor(false);
      });
  }, [user]);

  if (loading || checkingEditor || mfaLoading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>;
  }
  if (!user || !isEditor) return <Navigate to="/panel-8f3k2qx9" replace />;

  // Sesión sin subir a aal2 todavía (tiene 2FA activo pero no lo verificó
  // en esta sesión): de vuelta al login, que se encarga de pedir el código.
  if (aal && aal.next === 'aal2' && aal.current !== 'aal2') {
    return <Navigate to="/panel-8f3k2qx9" replace />;
  }

  return <>{children}</>;
}

// 2FA obligatorio: envuelve cada página del panel excepto "seguridad" y
// manda a activar el 2FA si el editor todavía no tiene un factor verificado.
function RequireMfa({ children }: { children: React.ReactNode }) {
  const { mfaFactors } = useAuth();
  const hasVerifiedMfa = mfaFactors.some((f) => f.status === 'verified');
  if (!hasVerifiedMfa) return <Navigate to="/panel-8f3k2qx9/seguridad" replace />;
  return <>{children}</>;
}

// Sin cuerpo_es/cuerpo_en: el listado (home, categorías, relacionados) no
// los necesita, y son la parte más pesada de cada fila. ArticlePage pide el
// cuerpo del artículo abierto aparte, en un fetch propio y liviano.
const LIST_COLUMNS =
  'id, raw_item_id, categoria, titulo_es, titulo_en, resumen_seo, fuente_nombre, fuente_url, imagen_url, autor, estado, creado_en, publicado_en';

function PublicSite() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [poll, setPoll] = useState<Poll | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // La encuesta activa se pide junto con los artículos (y no dentro del
    // widget) para saber antes del primer render de la home si hay que
    // reservarle espacio o no mostrar nada — sin saltos de layout.
    const now = new Date().toISOString();
    Promise.all([
      supabase
        .from('articles')
        .select(LIST_COLUMNS)
        .eq('estado', 'publicado')
        .order('publicado_en', { ascending: false }),
      supabase
        .from('polls')
        .select('*')
        .eq('active', true)
        .lte('starts_at', now)
        .gte('ends_at', now)
        .order('starts_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([articlesRes, pollRes]) => {
      setArticles((articlesRes.data as ArticleListItem[]) ?? []);
      setPoll((pollRes.data as Poll | null) ?? null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <LanguageProvider>
        <PublicLayout>
          <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">Cargando noticias...</div>
        </PublicLayout>
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <PublicLayout>
        <Routes>
          <Route path="/" element={<HomePage articles={articles} poll={poll} />} />
          <Route path="/categoria/:categoria" element={<CategoryPage articles={articles} />} />
          <Route path="/articulo/:id" element={<ArticlePage articles={articles} />} />
          <Route path="/acerca" element={<AboutPage />} />
          <Route path="/privacidad" element={<PrivacyPolicyPage />} />
          <Route path="/terminos" element={<TermsOfUsePage />} />
        </Routes>
      </PublicLayout>
    </LanguageProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Admin login */}
          <Route
            path="/panel-8f3k2qx9"
            element={
              <Suspense fallback={<AdminLoadingFallback />}>
                <AdminLogin />
              </Suspense>
            }
          />

          {/* Admin panel */}
          <Route
            path="/panel-8f3k2qx9/*"
            element={
              <ProtectedRoute>
                <Suspense fallback={<AdminLoadingFallback />}>
                  <AdminLayout>
                    <Routes>
                      <Route path="seguridad" element={<AdminMfaSetup />} />
                      <Route path="dashboard" element={<RequireMfa><AdminDashboard /></RequireMfa>} />
                      <Route path="revision" element={<RequireMfa><ReviewQueue /></RequireMfa>} />
                      <Route path="crear" element={<RequireMfa><ArticleEditor /></RequireMfa>} />
                      <Route path="editar/:id" element={<RequireMfa><ArticleEditor /></RequireMfa>} />
                      <Route path="fuentes" element={<RequireMfa><SourcesManager /></RequireMfa>} />
                      <Route path="banners" element={<RequireMfa><BannersManager /></RequireMfa>} />
                      <Route path="comentarios" element={<RequireMfa><CommentsManager /></RequireMfa>} />
                      <Route path="editores" element={<RequireMfa><EditorsManager /></RequireMfa>} />
                      <Route path="encuestas" element={<RequireMfa><AdminPolls /></RequireMfa>} />
                      <Route path="*" element={<Navigate to="/panel-8f3k2qx9/dashboard" replace />} />
                    </Routes>
                  </AdminLayout>
                </Suspense>
              </ProtectedRoute>
            }
          />

          {/* Public site */}
          <Route path="/*" element={<PublicSite />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
