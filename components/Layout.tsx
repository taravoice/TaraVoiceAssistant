
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Phone, Mail, Facebook, Twitter, Linkedin, Instagram, Youtube, Check, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { useSite } from '../context/SiteContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { content, subscribeToNewsletter } = useSite();
  
  // Newsletter State
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const navLinks = [
    { label: 'Home', path: '/' },
    { label: 'About', path: '/about' },
    { label: 'Features', path: '/features' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Blog', path: '/blog' },
    { label: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => {
    return location.pathname === path ? 'text-[#0097b2] font-semibold' : 'text-slate-600 hover:text-[#0097b2]';
  };

  const getLogoUrl = () => {
    const rawUrl = content.images.logo;
    if (!rawUrl || rawUrl.trim() === '') return '/logo.png';
    if (rawUrl.startsWith('http')) {
       return `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}t=${content.updatedAt}`;
    }
    return rawUrl;
  };

  const finalLogoUrl = getLogoUrl();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    
    setSubStatus('loading');
    try {
      await subscribeToNewsletter(email);
      setSubStatus('success');
      setEmail('');
      setTimeout(() => setSubStatus('idle'), 5000);
    } catch (err) {
      console.error(err);
      setSubStatus('error');
      setTimeout(() => setSubStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#d9d9d9] font-sans text-slate-900">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link to="/" className="flex items-center group">
              <img 
                key={content.updatedAt} 
                src={finalLogoUrl} 
                alt="Tara Voice Assistant" 
                className="h-10 md:h-12 w-auto object-contain transition-all duration-300"
                onError={(e) => {
                   const img = e.target as HTMLImageElement;
                   if (img.src !== window.location.origin + '/logo.png') {
                       img.src = '/logo.png';
                   }
                }}
              />
            </Link>

            <nav className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`${isActive(link.path)} transition-colors duration-200 text-base tracking-wide`}
                >
                  {link.label}
                </Link>
              ))}
              <Link to="/contact">
                <Button size="md">Get Started</Button>
              </Link>
            </nav>

            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-slate-600 hover:text-slate-900 focus:outline-none"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-100 animate-fade-in-down">
            <div className="px-4 pt-2 pb-6 space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-base font-medium ${
                    location.pathname === link.path
                      ? 'bg-[#0097b2]/10 text-[#0097b2]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4">
                 <Link to="/contact" onClick={() => setIsMenuOpen(false)}>
                    <Button fullWidth>Get Started</Button>
                 </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow pt-20">
        {children}
      </main>

      <footer className="bg-black text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-1">
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Revolutionizing customer engagement through innovative AI automation. Always on, always accurate.
              </p>
              <div className="flex space-x-4">
                <a href="https://www.facebook.com/taravoicea" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                  <Facebook className="w-5 h-5" />
                </a>
                <a href="https://www.x.com/TaraAIAppnSettr" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="https://www.linkedin.com/company/taravoiceassistant" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="https://www.instagram.com/taravoiceassistant" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="https://www.youtube.com/@Taravoiceassistant" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors">
                  <Youtube className="w-5 h-5" />
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">Quick Links</h3>
              <ul className="space-y-3">
                {navLinks.map(link => (
                  <li key={link.path}>
                    <Link to={link.path} className="text-slate-400 hover:text-[#0097b2] text-sm transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">Contact</h3>
              <ul className="space-y-3 text-sm text-slate-400">
                <li className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-[#0097b2] shrink-0" />
                  <span>info@taravoiceassistant.com</span>
                </li>
                <li className="flex items-start space-x-3">
                  <Phone className="w-5 h-5 text-[#0097b2] shrink-0" />
                  <span>620 628 2377</span>
                </li>
              </ul>
            </div>

            <div>
               <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">Newsletter</h3>
               <p className="text-slate-400 text-sm mb-4">Stay updated with our latest AI features.</p>
               <form onSubmit={handleSubscribe} className="flex">
                 <input 
                   type="email" 
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                   placeholder="Enter your email" 
                   className="bg-slate-800 border-none text-white px-4 py-2 rounded-l-md w-full outline-none focus:ring-1 focus:ring-[#0097b2]"
                   required
                   disabled={subStatus === 'loading' || subStatus === 'success'}
                 />
                 <button 
                   type="submit" 
                   disabled={subStatus === 'loading' || subStatus === 'success'}
                   className={`px-4 py-2 rounded-r-md transition-colors flex items-center justify-center min-w-[70px] ${
                     subStatus === 'success' ? 'bg-green-600' : 'bg-[#0097b2] hover:bg-[#007f96]'
                   }`}
                 >
                   {subStatus === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                   {subStatus === 'success' && <Check className="w-4 h-4" />}
                   {subStatus === 'idle' && 'Join'}
                   {subStatus === 'error' && 'Retry'}
                 </button>
               </form>
               {subStatus === 'success' && <p className="text-green-400 text-xs mt-2">Thanks for subscribing!</p>}
            </div>
          </div>
          
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} Tara Voice Assistant. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
