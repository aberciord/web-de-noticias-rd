import { NavLink, useNavigate } from 'react-router-dom';
import { Newspaper, LayoutDashboard, FileEdit, PlusCircle, Rss, Image, LogOut, ExternalLink, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/revision', label: 'Cola de revisión', icon: FileEdit },
  { to: '/admin/crear', label: 'Nueva nota', icon: PlusCircle },
  { to: '/admin/fuentes', label: 'Fuentes RSS', icon: Rss },
  { to: '/admin/banners', label: 'Banners', icon: Image },
  { to: '/admin/comentarios', label: 'Comentarios', icon: MessageCircle },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 bg-slate-900 text-slate-300 flex-shrink-0 lg:min-h-screen lg:fixed lg:left-0 lg:top-0 lg:bottom-0 flex flex-col z-40">
        <div className="p-5 border-b border-slate-700">
          <a href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <Newspaper className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <span className="text-lg font-bold text-white block leading-none">
                Noticias<span className="text-red-500">RD</span>
              </span>
              <span className="text-xs text-slate-400">Panel editorial</span>
            </div>
          </a>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-x-auto lg:overflow-x-visible">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-slate-900'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-700 space-y-1">
          <a
            href="/"
            target="_blank"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ExternalLink className="w-5 h-5" />
            Ver sitio
          </a>
          <div className="px-4 py-2 text-xs text-slate-500 truncate">
            {user?.email}
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
