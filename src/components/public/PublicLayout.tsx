import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Newspaper, Menu, X, Search, Globe } from 'lucide-react';
import { CATEGORIAS } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import type { Banner } from '@/lib/types';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerBanner, setHeaderBanner] = useState<Banner | null>(null);
  const { language, setLanguage } = useLanguage();
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    supabase
      .from('banners')
      .select('*')
      .eq('posicion', 'header')
      .eq('activo', true)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setHeaderBanner(data as Banner | null));
  }, []);

  const navLinks = [
    { to: '/', label: language === 'en' ? 'Home' : 'Inicio' },
    ...CATEGORIAS.map((c) => ({ to: `/categoria/${c.value}`, label: language === 'en' ? c.labelEn : c.label })),
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="bg-slate-900 text-slate-300 text-xs">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <span className="hidden sm:inline">
            {new Date().toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage('es')}
              className={`flex items-center gap-1 hover:text-white transition-colors ${language === 'es' ? 'text-white font-semibold' : ''}`}
            >
              <Globe className="w-3 h-3" /> ES
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`hover:text-white transition-colors ${language === 'en' ? 'text-white font-semibold' : ''}`}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Header banner */}
      {headerBanner && (
        <div className="bg-slate-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <a href={headerBanner.link ?? '#'} target="_blank" rel="noopener noreferrer">
              <img
                src={headerBanner.imagen_url}
                alt={headerBanner.titulo ?? 'Banner publicitario'}
                className="w-full h-20 sm:h-24 object-cover rounded-lg"
              />
            </a>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b-2 border-slate-900 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="El poder del pueblo RD"
                className="h-14 w-auto transition-transform group-hover:scale-105"
              />
              <div className="hidden sm:block">
                <p className="text-xs text-slate-500 leading-none">
                  {language === 'en' ? 'Dominican news portal' : 'Portal de noticias dominicano'}
                </p>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors">
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <Newspaper className="w-5 h-5 text-slate-900" />
                </div>
                <span className="font-heading text-xl font-bold text-white">
                  El poder del pueblo <span className="text-red-500">RD</span>
                </span>
              </div>
              <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                {language === 'en'
                  ? 'News portal of the Dominican Republic. Up-to-date information on news, sports, politics, and entertainment. Original content generated respecting copyright under Law 65-00.'
                  : 'Portal de noticias de la República Dominicana. Información actualizada sobre noticias, deportes, política y farándula. Contenido original generado respetando el derecho de autor conforme a la Ley 65-00.'}
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                {language === 'en' ? 'Sections' : 'Secciones'}
              </h3>
              <ul className="space-y-2">
                {CATEGORIAS.map((cat) => (
                  <li key={cat.value}>
                    <Link to={`/categoria/${cat.value}`} className="text-sm text-slate-400 hover:text-white transition-colors">
                      {language === 'en' ? cat.labelEn : cat.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">
                {language === 'en' ? 'Information' : 'Información'}
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/acerca" className="text-sm text-slate-400 hover:text-white transition-colors">
                    {language === 'en' ? 'About us' : 'Acerca de nosotros'}
                  </Link>
                </li>
                <li><span className="text-sm text-slate-400">contacto@elpoderdelpueblord.com</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} El poder del pueblo RD. {language === 'en' ? 'All rights reserved.' : 'Todos los derechos reservados.'}
            </p>
            <p className="text-xs text-slate-500">
              {language === 'en'
                ? 'Published articles cite their original source with a link.'
                : 'Las notas publicadas citan su fuente original con enlace.'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
