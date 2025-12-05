import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import Contact from './pages/Contact';

// Admin Imports
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import ContentManager from './pages/admin/ContentManager';
import MediaManager from './pages/admin/MediaManager';
import Gallery from './pages/admin/Gallery';
import { SiteProvider } from './context/SiteContext';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  return (
    <SiteProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Admin Routes (Standalone Layout) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
             <Route path="dashboard" element={<Dashboard />} />
             <Route path="content" element={<ContentManager />} />
             <Route path="media" element={<MediaManager />} />
             <Route path="gallery" element={<Gallery />} />
             <Route path="settings" element={<div className="text-slate-600">Settings placeholder.</div>} />
          </Route>

          {/* Public Website Routes (Main Layout) */}
          <Route path="*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/about" element={<About />} />
                <Route path="/features" element={<Features />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/contact" element={<Contact />} />
              </Routes>
            </Layout>
          } />
        </Routes>
        <Analytics />
      </Router>
    </SiteProvider>
  );
}

export default App;
