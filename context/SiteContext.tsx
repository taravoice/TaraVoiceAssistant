import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, ensureAuth } from '../firebase';
import { ref, getDownloadURL, listAll, deleteObject, uploadString } from 'firebase/storage';

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
  login: (password: string) => boolean;
  logout: () => void;
  changePassword: (newPassword: string) => void;
  isInitialized: boolean;
}

// EMPTY DEFAULTS: Forces browser to wait for authoritative Cloud Data
const initialImages: SiteImages = {
  logo: '',
  homeHeroBg: '',
  homeIndustry1: '',
  homeIndustry2: '',
  feature1: '',
  feature2: '',
  feature3: '',
  feature4: '',
  feature5: '',
  feature6: '',
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
  
  const adminPassword = localStorage.getItem('tara_admin_pw') || '987654321';

  const initSite = useCallback(async () => {
    // 1. Check if we have bucket access
    if (!storage) {
      setIsInitialized(true);
      return;
    }
    setIsStorageConfigured(true);

    try {
      const configRef = ref(storage, 'config/site_config.json');
      const baseUrl = await getDownloadURL(configRef);
      
      // 2. Authoritative Cache Busting: Ensures every device gets the LATEST mapping
      const separator = baseUrl.includes('?') ? '&' : '?';
      const response = await fetch(`${baseUrl}${separator}t=${Date.now()}`, { 
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok) {
        const cloudConfig = await response.json();
        if (cloudConfig) {
          setContent(prev => {
             // TOTAL OVERRIDE: Prevent local defaults from fighting with the database
             const updated = {
               ...prev,
               ...cloudConfig,
               images: { ...cloudConfig.images }, // Force exact cloud object
               updatedAt: cloudConfig.updatedAt || prev.updatedAt,
               gallery: prev.gallery
             };
             localStorage.setItem('tara_site_config', JSON.stringify(updated));
             console.log("☁️ SITE CONTEXT: Globally Synced Config Applied.");
             return updated;
          });
        }
      }
    } catch (err) {
      console.warn("☁️ SITE CONTEXT: Cloud config unavailable. Using cached local copy.");
      const local = localStorage.getItem('tara_site_config');
      if (local) {
        try {
          setContent(prev => ({ ...prev, ...JSON.parse(local) }));
        } catch (e) {}
      }
    }

    try {
      const galleryListRef = ref(storage, 'gallery/');
      const res = await listAll(galleryListRef);
      const urls = await Promise.all(res.items.map(r => getDownloadURL(r)));
      setContent(prev => ({ ...prev, gallery: urls }));
    } catch (e) {}

    setIsInitialized(true);
  }, []);

  useEffect(() => {
    initSite();
  }, [initSite]);

  const saveToCloud = useCallback(async (newContent: SiteContent) => {
    if (!storage) return;
    try {
      await ensureAuth();
      const configRef = ref(storage, 'config/site_config.json');
      const { gallery, ...saveData } = newContent;
      await uploadString(configRef, JSON.stringify(saveData), 'raw', {
        contentType: 'application/json',
        cacheControl: 'no-cache, no-store, must-revalidate'
      });
      console.log("☁️ SITE CONTEXT: Successfully broadcasted changes to the cloud.");
    } catch (e) {
      console.error("☁️ SITE CONTEXT: Cloud sync failed.", e);
    }
  }, []);

  const updateHomeContent = async (key: keyof SiteContent['home'], value: any) => {
    const time = Date.now();
    setContent(prev => {
      const updated = { 
        ...prev, 
        home: { ...prev.home, [key]: value }, 
        updatedAt: time 
      };
      localStorage.setItem('tara_site_config', JSON.stringify(updated));
      saveToCloud(updated);
      return updated;
    });
  };

  const addCustomSection = async (section: CustomSection) => {
    const time = Date.now();
    setContent(prev => {
      const updated = { 
        ...prev, 
        customSections: [...prev.customSections, section], 
        updatedAt: time 
      };
      localStorage.setItem('tara_site_config', JSON.stringify(updated));
      saveToCloud(updated);
      return updated;
    });
  };

  const removeCustomSection = async (id: string) => {
    const time = Date.now();
    setContent(prev => {
      const updated = { 
        ...prev, 
        customSections: prev.customSections.filter(s => s.id !== id), 
        updatedAt: time 
      };
      localStorage.setItem('tara_site_config', JSON.stringify(updated));
      saveToCloud(updated);
      return updated;
    });
  };

  const updateImage = async (key: string, url: string) => {
    const time = Date.now();
    setContent(prev => {
      const updated = { 
        ...prev, 
        images: { 
          ...prev.images, 
          [key]: url 
        }, 
        updatedAt: time 
      };
      localStorage.setItem('tara_site_config', JSON.stringify(updated));
      saveToCloud(updated);
      return updated;
    });
  };

  const uploadToGallery = async (file: File) => {
    if (!storage) return;
    try {
      await ensureAuth();
      const path = `gallery/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      const { uploadBytes } = await import('firebase/storage');
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
  if (!context) throw new Error('Site Context is required.');
  return context;
};
