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
import type { Article } from '@/lib/types';

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

function AdminLoadingFallback() {
  return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
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

  if (loading || checkingEditor) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>;
  if (!user || !isEditor) return <Navigate to="/panel-8f3k2qx9" replace />;
  return <>{children}</>;
}

function PublicSite() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('articles')
      .select('*')
      .eq('estado', 'publicado')
      .order('publicado_en', { ascending: false })
      .then(({ data }) => {
        setArticles(data as Article[] ?? []);
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
          <Route path="/" element={<HomePage articles={articles} />} />
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
                      <Route path="dashboard" element={<AdminDashboard />} />
                      <Route path="revision" element={<ReviewQueue />} />
                      <Route path="crear" element={<ArticleEditor />} />
                      <Route path="editar/:id" element={<ArticleEditor />} />
                      <Route path="fuentes" element={<SourcesManager />} />
                      <Route path="banners" element={<BannersManager />} />
                      <Route path="comentarios" element={<CommentsManager />} />
                      <Route path="editores" element={<EditorsManager />} />
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
