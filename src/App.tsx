import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import PublicLayout from '@/components/public/PublicLayout';
import HomePage from '@/pages/public/HomePage';
import CategoryPage from '@/pages/public/CategoryPage';
import ArticlePage from '@/pages/public/ArticlePage';
import AboutPage from '@/pages/public/AboutPage';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import ReviewQueue from '@/pages/admin/ReviewQueue';
import ArticleEditor from '@/pages/admin/ArticleEditor';
import SourcesManager from '@/pages/admin/SourcesManager';
import BannersManager from '@/pages/admin/BannersManager';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Article } from '@/lib/types';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cargando...</div>;
  if (!user) return <Navigate to="/admin" replace />;
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
      <PublicLayout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400">Cargando noticias...</div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <Routes>
        <Route path="/" element={<HomePage articles={articles} />} />
        <Route path="/categoria/:categoria" element={<CategoryPage articles={articles} />} />
        <Route path="/articulo/:id" element={<ArticlePage articles={articles} />} />
        <Route path="/acerca" element={<AboutPage />} />
      </Routes>
    </PublicLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Admin login */}
          <Route path="/admin" element={<AdminLogin />} />

          {/* Admin panel */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="revision" element={<ReviewQueue />} />
                    <Route path="crear" element={<ArticleEditor />} />
                    <Route path="editar/:id" element={<ArticleEditor />} />
                    <Route path="fuentes" element={<SourcesManager />} />
                    <Route path="banners" element={<BannersManager />} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Routes>
                </AdminLayout>
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
