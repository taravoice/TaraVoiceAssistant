
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import Layout from './components/Layout';
import Home from './pages/Home';
import About from './pages/About';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Contact from './pages/Contact';

// Admin Imports
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import ContentManager from './pages/admin/ContentManager';
import MediaManager from './pages/admin/MediaManager';
import Gallery from './pages/admin/Gallery';
import Settings from './pages/admin/Settings';
import Newsletter from './pages/admin/Newsletter';
import { SiteProvider, useSite } from './context/SiteContext';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function PageTracker() {
  const { pathname } = useLocation();
  const { logVisit } = useSite();

  useEffect(() => {
    logVisit(pathname);
  }, [pathname, logVisit]);

  return null;
}

function App() {
  return (
    <SiteProvider>
      <Router>
        <ScrollToTop />
        <PageTracker />
        <Routes>
          {/* Admin Routes (Standalone Layout) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
             <Route path="dashboard" element={<Dashboard />} />
             <Route path="newsletter" element={<Newsletter />} />
             <Route path="content" element={<ContentManager />} />
             <Route path="media" element={<MediaManager />} />
             <Route path="gallery" element={<Gallery />} />
             <Route path="settings" element={<Settings />} />
          </Route>

          {/* Public Website Routes (Main Layout) */}
          <Route path="*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="about" element={<About />} />
                <Route path="features" element={<Features />} />
                <Route path="pricing" element={<Pricing />} />
                <Route path="blog" element={<Blog />} />
                <Route path="blog/:slug" element={<BlogPost />} />
                <Route path="contact" element={<Contact />} />
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
