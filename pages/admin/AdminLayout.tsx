
import React from 'react';
import { Link, useLocation, Navigate, Outlet } from 'react-router-dom';
import { LayoutDashboard, FileText, Image as ImageIcon, Settings as SettingsIcon, LogOut, ExternalLink, Grid, AlertTriangle, CloudOff } from 'lucide-react';
import { useSite } from '../../context/SiteContext';

const AdminLayout: React.FC = () => {
  const { isAuthenticated, logout, content, isStorageConfigured, syncError } = useSite();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Content Editor', path: '/admin/content', icon: FileText },
    { label: 'Media Manager', path: '/admin/media', icon: ImageIcon },
    { label: 'Gallery', path: '/admin/gallery', icon: Grid },
    { label: 'Settings', path: '/admin/settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
            <img src={content.images.logo} className="h-8 w-auto brightness-0 invert" alt="Logo" />
            <span className="font-bold text-lg">Admin</span>
        </div>
        
        <nav className="flex-grow p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-[#0097b2] text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
           <Link to="/" target="_blank" className="flex items-center space-x-3 px-4 py-3 text-slate-400 hover:text-white transition-colors mb-2">
              <ExternalLink className="w-5 h-5" />
              <span>View Live Site</span>
           </Link>
          <button
            onClick={logout}
            className="flex items-center space-x-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm h-16 flex items-center px-8 justify-between md:hidden">
            <span className="font-bold">Tara Admin</span>
            <button onClick={logout} className="text-slate-500"><LogOut className="w-5 h-5" /></button>
        </header>

        {!isStorageConfigured && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-3 flex items-center text-amber-800 text-sm">
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span>
              <strong>Storage not connected:</strong> Image uploads are disabled. Add your Firebase keys in Vercel to enable the Gallery.
            </span>
          </div>
        )}

        {syncError && (
           <div className="bg-red-600 text-white px-8 py-3 flex items-center shadow-lg animate-fade-in-down">
              <CloudOff className="w-5 h-5 mr-3" />
              <div className="flex-1">
                 <p className="font-bold">Changes Not Saved to Cloud</p>
                 <p className="text-sm opacity-90">{syncError}</p>
              </div>
              <Link to="/admin/settings" className="bg-white text-red-600 px-3 py-1.5 rounded-md text-sm font-bold hover:bg-red-50">
                 Fix Config
              </Link>
           </div>
        )}

        <main className="flex-1 overflow-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
