import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search, Globe, Youtube, Instagram, Facebook, X as XIcon, MessageCircle, Mail } from 'lucide-react';
import { CATEGORIAS } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { SOCIAL_LINKS } from '@/lib/socialLinks';
import NewsletterSignup from '@/components/public/NewsletterSignup';
import WeatherWidget from '@/components/public/WeatherWidget';
import type { Banner } from '@/lib/types';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [headerBanner, setHeaderBanner] = useState<Banner | null>(null);
  const [footerBanner, setFooterBanner] = useState<Banner | null>(null);
  const { language, setLanguage } = useLanguage();
  const location = useLocation();

  const categoriaActual = location.pathname.match(/^\/categoria\/([a-z]+)/)?.[1] ?? null;

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const loadHeaderBanner = async () => {
      if (categoriaActual) {
        const { data: propio } = await supabase
          .from('banners')
          .select('*')
          .eq('posicion', 'header')
          .eq('activo', true)
          .eq('categoria', categoriaActual)
          .order('creado_en', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (propio) {
          setHeaderBanner(propio as Banner);
          return;
        }
      }

      const { data: general } = await supabase
        .from('banners')
        .select('*')
        .eq('posicion', 'header')
        .eq('activo', true)
        .is('categoria', null)
        .order('creado_en', { ascending: false })
        .limit(1)
        .maybeSingle();

      setHeaderBanner(general as Banner | null);
    };

    loadHeaderBanner();
  }, [categoriaActual]);

  useEffect(() => {
    supabase
      .from('banners')
      .select('*')
      .eq('posicion', 'footer')
      .eq('activo', true)
      .order('creado_en', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setFooterBanner(data as Banner | null));
  }, []);

  const navLinks = [
    { to: '/', label: language === 'en' ? 'Home' : 'Inicio' },
    ...CATEGORIAS.map((c) => ({ to: `/categoria/${c.value}`, label: language === 'en' ? c.labelEn : c.label })),
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top bar */}
      <div className="bg-brand-blue-dark text-blue-100 text-xs">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <span className="hidden sm:inline">
            {new Date().toLocaleDateString('es-DO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <div className="flex items-center gap-3">
            <WeatherWidget />
            <div className="hidden sm:flex items-center gap-2">
              <a
                href={SOCIAL_LINKS.youtube}
                target="_blank"
                rel="noopener noreferrer"
                title={language === 'en' ? 'Follow us on YouTube' : 'Síguenos en YouTube'}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500 hover:scale-110 transition-all"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href={SOCIAL_LINKS.instagram}
                target="_blank"
                rel="noopener noreferrer"
                title={language === 'en' ? 'Follow us on Instagram' : 'Síguenos en Instagram'}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-pink-600 to-purple-600 text-white hover:scale-110 transition-transform"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href={SOCIAL_LINKS.facebook}
                target="_blank"
                rel="noopener noreferrer"
                title={language === 'en' ? 'Follow us on Facebook' : 'Síguenos en Facebook'}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500 hover:scale-110 transition-all"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href={SOCIAL_LINKS.x}
                target="_blank"
                rel="noopener noreferrer"
                title={language === 'en' ? 'Follow us on X' : 'Síguenos en X'}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-950 text-white hover:bg-slate-800 hover:scale-110 transition-all"
              >
                <XIcon className="w-3.5 h-3.5" />
              </a>
            </div>
            <button
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              className="flex items-center gap-1.5 hover:text-white transition-colors font-medium"
            >
              <Globe className="w-3.5 h-3.5" />
              {language === 'es' ? 'Cambiar a inglés' : 'Cambiar a español'}
            </button>
          </div>
        </div>
      </div>

      {/* Header banner — espacio reservado para publicidad contratada */}
      {headerBanner && (
        <div className="bg-slate-100 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <a href={headerBanner.link ?? '#'} target="_blank" rel="noopener noreferrer">
              <img
                src={headerBanner.imagen_url}
                alt={headerBanner.titulo ?? 'Banner publicitario'}
                className="w-full h-32 sm:h-44 lg:h-52 object-contain rounded-lg bg-white"
              />
            </a>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-24 sm:h-28">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/logo.png"
                alt="El poder del pueblo RD"
                className="h-20 sm:h-24 w-auto transition-transform group-hover:scale-105"
              />
              <div className="hidden md:block">
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
                  className={`px-4 py-2.5 rounded-lg text-base font-semibold transition-colors ${
                    location.pathname === link.to
                      ? 'bg-brand-blue text-white'
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
                  className={`block px-4 py-3 rounded-lg text-base font-semibold transition-colors ${
                    location.pathname === link.to
                      ? 'bg-brand-blue text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Flag-color accent strip */}
        <div className="h-1.5 flex">
          <div className="flex-1 bg-brand-blue" />
          <div className="flex-1 bg-white" />
          <div className="flex-1 bg-brand-red" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Newsletter */}
      <div className="max-w-7xl mx-auto px-4 mt-4">
        <NewsletterSignup />
      </div>

      {/* Footer */}
      <footer className="bg-brand-blue-dark text-slate-300 mt-12">
        {footerBanner && (
          <div className="max-w-7xl mx-auto px-4 pt-8">
            <a href={footerBanner.link ?? '#'} target="_blank" rel="noopener noreferrer">
              <img
                src={footerBanner.imagen_url}
                alt={footerBanner.titulo ?? 'Banner publicitario'}
                className="w-full h-24 sm:h-32 object-contain rounded-lg bg-white"
              />
            </a>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo.png" alt="El poder del pueblo RD" className="h-12 w-12 rounded-lg bg-white object-contain p-1" />
                <span className="font-heading text-xl font-bold text-white">
                  El poder del pueblo <span className="text-red-500">RD</span>
                </span>
              </div>
              <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                {language === 'en'
                  ? 'News portal of the Dominican Republic. Up-to-date information on news, sports, politics, and entertainment. Original content generated respecting copyright under Law 65-00.'
                  : 'Portal de noticias de la República Dominicana. Información actualizada sobre noticias, deportes, política y farándula. Contenido original generado respetando el derecho de autor conforme a la Ley 65-00.'}
              </p>
              <div className="flex items-center gap-3 mt-4">
                <a
                  href={SOCIAL_LINKS.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="YouTube"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Youtube className="w-4 h-4" />
                </a>
                <a
                  href={SOCIAL_LINKS.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href={SOCIAL_LINKS.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href={SOCIAL_LINKS.x}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="X"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </a>
                <a
                  href={SOCIAL_LINKS.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="WhatsApp"
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              </div>
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
                <li>
                  <Link to="/privacidad" className="text-sm text-slate-400 hover:text-white transition-colors">
                    {language === 'en' ? 'Privacy policy' : 'Política de privacidad'}
                  </Link>
                </li>
                <li>
                  <Link to="/terminos" className="text-sm text-slate-400 hover:text-white transition-colors">
                    {language === 'en' ? 'Terms of use' : 'Términos de uso'}
                  </Link>
                </li>
                <li>
                  <a href={`mailto:${SOCIAL_LINKS.email}`} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                    <Mail className="w-3.5 h-3.5" />
                    {SOCIAL_LINKS.email}
                  </a>
                </li>
                <li>
                  <a href={SOCIAL_LINKS.whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
                    <MessageCircle className="w-3.5 h-3.5" />
                    {SOCIAL_LINKS.whatsappDisplay}
                  </a>
                </li>
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
          <div className="mt-4 flex justify-center">
            <a
              href="https://wa.me/18494473001"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >
              Desarrollado por MR. NUÑEZ DESIGN
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
