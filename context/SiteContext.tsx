
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, ensureAuth } from '../firebase';
import { ref, getDownloadURL, listAll, deleteObject, uploadString, uploadBytes } from 'firebase/storage';

export interface CustomSection {
  id: string;
  title: string;
  content: string;
  image?: string;
  page: string; 
}

interface SiteImages {
  [key: string]: string;
}

interface SiteContent {
  home: {
    heroTitle: string;
    heroSubtitle: string;
    aboutTitle: string;
    aboutText: string;
  };
  customSections: CustomSection[];
  images: SiteImages;
  gallery: string[];
  updatedAt: number;
}

interface SiteContextType {
  content: SiteContent;
  updateHomeContent: (key: keyof SiteContent['home'], value: any) => Promise<void>;
  addCustomSection: (section: CustomSection) => Promise<void>;
  removeCustomSection: (id: string) => Promise<void>;
  updateImage: (key: string, url: string) => Promise<void>;
  uploadToGallery: (file: File) => Promise<void>;
  removeFromGallery: (url: string) => Promise<void>;
  logVisit: (path: string) => Promise<void>;
  isAuthenticated: boolean;
  isStorageConfigured: boolean;
  syncError: string | null;
  login: (password: string) => boolean;
  logout: () => void;
  changePassword: (newPassword: string) => void;
  isInitialized: boolean;
}

// SMART DEFAULTS: Shown until Admin updates them in Cloud
const initialImages: SiteImages = {
  logo: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop',
  homeHeroBg: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop',
  homeIndustry1: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop',
  homeIndustry2: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop',
  feature1: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=2068&auto=format&fit=crop',
  feature2: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1000',
  feature3: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop',
  feature4: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?q=80&w=2069&auto=format&fit=crop',
  feature5: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop',
  feature6: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=2006&auto=format&fit=crop',
  aboutTeam: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop',
  aboutFuture: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop',
};

const initialContent: SiteContent = {
  home: {
    heroTitle: "AI Appointment Setter for Your Business",
    heroSubtitle: "Automate your scheduling 24/7 with human-like accuracy.",
    aboutTitle: "About Tara Voice Assistant",
    aboutText: "Tara is a cutting-edge AI solution designed for SMBs.",
  },
  customSections: [],
  images: initialImages,
  gallery: [],
  updatedAt: Date.now()
};

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<SiteContent>(initialContent);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStorageConfigured, setIsStorageConfigured] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const adminPassword = localStorage.getItem('tara_admin_pw') || '987654321';

  const initSite = useCallback(async () => {
    if (!storage) {
      console.warn("⚠️ Firebase Storage is NOT initialized. Check API keys.");
      setIsInitialized(true);
      return;
    }
    setIsStorageConfigured(true);

    try {
      // Ensure anonymous auth to access bucket
      await ensureAuth().catch(err => console.warn("Anon Auth failed, trying public access...", err));
      
      const configRef = ref(storage, 'config/site_config.json');
      const baseUrl = await getDownloadURL(configRef);
      
      const separator = baseUrl.includes('?') ? '&' : '?';
      // Robust cache busting
      const response = await fetch(`${baseUrl}${separator}t=${Date.now()}&nocache=true`, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });
      
      if (response.ok) {
        const cloudConfig = await response.json();
        if (cloudConfig) {
          console.log("☁️ SITE CONTEXT: Config loaded from cloud.", cloudConfig.updatedAt);
          setContent(prev => {
             const updated = {
               ...prev,
               ...cloudConfig,
               images: { ...prev.images, ...cloudConfig.images }, // Authoritative merge
               updatedAt: cloudConfig.updatedAt || Date.now(),
               gallery: prev.gallery // Gallery is fetched separately
             };
             localStorage.setItem('tara_site_config', JSON.stringify(updated));
             return updated;
          });
        }
      } else {
        throw new Error(`Config fetch failed: ${response.status}`);
      }
    } catch (err) {
      console.warn("☁️ SITE CONTEXT: Using cached or default data due to load error.", err);
      const local = localStorage.getItem('tara_site_config');
      if (local) {
        try {
          setContent(prev => ({ ...prev, ...JSON.parse(local) }));
        } catch (e) {}
      }
    }

    // Always fetch the gallery if possible
    try {
      if (!isAuthenticated) await ensureAuth().catch(() => {});
      const galleryListRef = ref(storage, 'gallery/');
      const res = await listAll(galleryListRef);
      const urls = await Promise.all(res.items.map(r => getDownloadURL(r)));
      setContent(prev => ({ ...prev, gallery: urls }));
    } catch (e) {
      console.warn("Gallery load failed (likely permission or empty)", e);
    }

    setIsInitialized(true);
  }, [isAuthenticated]);

  useEffect(() => {
    initSite();
  }, [initSite]);

  const saveToCloud = useCallback(async (newContent: SiteContent) => {
    if (!storage) {
      const msg = "Cloud Sync Failed: Storage is not configured in environment variables.";
      setSyncError(msg);
      throw new Error(msg);
    }
    try {
      await ensureAuth();
      const configRef = ref(storage, 'config/site_config.json');
      const { gallery, ...saveData } = newContent;
      
      console.log("☁️ SITE CONTEXT: Saving config to cloud...", saveData.updatedAt);
      
      await uploadString(configRef, JSON.stringify(saveData), 'raw', {
        contentType: 'application/json',
        cacheControl: 'no-cache, no-store, must-revalidate'
      });
      console.log("☁️ SITE CONTEXT: Save success.");
      setSyncError(null);
    } catch (e: any) {
      console.error("☁️ SITE CONTEXT: Broadcast failed.", e);
      setSyncError(e.message || "Unknown Cloud Sync Error");
      throw e; 
    }
  }, []);

  const updateHomeContent = async (key: keyof SiteContent['home'], value: any) => {
    const time = Date.now();
    const updated = { 
      ...content, 
      home: { ...content.home, [key]: value }, 
      updatedAt: time 
    };
    
    setContent(updated);
    localStorage.setItem('tara_site_config', JSON.stringify(updated));
    try {
      await saveToCloud(updated);
    } catch (e) {
      // Catch here so inputs don't crash, but syncError state is set
      console.warn("Background save failed");
    }
  };

  const addCustomSection = async (section: CustomSection) => {
    const time = Date.now();
    const updated = { 
      ...content, 
      customSections: [...content.customSections, section], 
      updatedAt: time 
    };
    
    setContent(updated);
    localStorage.setItem('tara_site_config', JSON.stringify(updated));
    try {
      await saveToCloud(updated);
    } catch (e) {
      console.warn("Background save failed");
    }
  };

  const removeCustomSection = async (id: string) => {
    const time = Date.now();
    const updated = { 
      ...content, 
      customSections: content.customSections.filter(s => s.id !== id), 
      updatedAt: time 
    };
    
    setContent(updated);
    localStorage.setItem('tara_site_config', JSON.stringify(updated));
    try {
      await saveToCloud(updated);
    } catch (e) {
      console.warn("Background save failed");
    }
  };

  const updateImage = async (key: string, url: string) => {
    const time = Date.now();
    const updated = { 
      ...content, 
      images: { 
        ...content.images, 
        [key]: url 
      }, 
      updatedAt: time 
    };
    
    setContent(updated);
    localStorage.setItem('tara_site_config', JSON.stringify(updated));
    // Media updates should propagate error to caller (Spinner)
    await saveToCloud(updated);
  };

  const uploadToGallery = async (file: File) => {
    if (!storage) throw new Error("Storage not configured");
    try {
      await ensureAuth();
      const path = `gallery/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      const snap = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snap.ref);
      setContent(prev => ({ ...prev, gallery: [url, ...prev.gallery] }));
    } catch (e) { throw e; }
  };

  const removeFromGallery = async (url: string) => {
     if (!storage) return;
     try {
       await ensureAuth();
       if (url.includes('firebasestorage.googleapis.com')) {
          const r = ref(storage, url);
          await deleteObject(r);
       }
       setContent(prev => ({ ...prev, gallery: prev.gallery.filter(i => i !== url) }));
     } catch (e) {}
  };

  const login = (input: string) => {
    if (input === adminPassword) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => setIsAuthenticated(false);

  const changePassword = (pw: string) => {
    localStorage.setItem('tara_admin_pw', pw);
  };

  const logVisit = async (path: string) => {
    if (!storage || path.startsWith('/admin')) return;
    try {
      await ensureAuth();
      const sid = sessionStorage.getItem('t_sid') || Math.random().toString(36).substring(2);
      sessionStorage.setItem('t_sid', sid);
      const data = { path, timestamp: Date.now(), sid, ua: navigator.userAgent };
      const logRef = ref(storage, `analytics/logs/${Date.now()}.json`);
      await uploadString(logRef, JSON.stringify(data), 'raw', { contentType: 'application/json' });
    } catch (e) {}
  };

  return (
    <SiteContext.Provider value={{ 
      content, 
      updateHomeContent, 
      addCustomSection, 
      removeCustomSection, 
      updateImage, 
      uploadToGallery, 
      removeFromGallery, 
      logVisit, 
      isAuthenticated, 
      isStorageConfigured,
      syncError, 
      login, 
      logout, 
      changePassword,
      isInitialized
    }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) throw new Error('Site Context missing.');
  return context;
};
