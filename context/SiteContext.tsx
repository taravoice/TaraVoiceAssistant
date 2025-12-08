
import React, { createContext, useContext, useState, useEffect } from 'react';
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

const defaultImages: SiteImages = {
  logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?q=80&w=200&auto=format&fit=crop',
  homeHeroBg: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop',
  homeIndustry1: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop',
  homeIndustry2: 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=800&auto=format&fit=crop',
  feature1: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=2068&auto=format&fit=crop',
  feature2: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1740&auto=format&fit=crop',
  feature3: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?q=80&w=2069&auto=format&fit=crop',
  feature4: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop',
  feature5: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1740&auto=format&fit=crop',
  feature6: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop',
};

const systemGallery = [...Object.values(defaultImages)];

const defaultContent: SiteContent = {
  home: {
    heroTitle: "AI Appointment Setter for Your Business",
    heroSubtitle: "Automate your appointment scheduling and handle customer interactions 24/7 with human-like accuracy.",
    aboutTitle: "About Tara Voice Assistant",
    aboutText: "Tara Voice Assistant is a cutting-edge AI-driven solution designed to empower small and medium-sized businesses.",
  },
  customSections: [],
  images: defaultImages,
  gallery: systemGallery,
  updatedAt: 0
};

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStorageConfigured, setIsStorageConfigured] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [adminPassword, setAdminPassword] = useState(() => {
    return localStorage.getItem('tara_admin_pw') || '987654321';
  });

  useEffect(() => {
    const initSite = async () => {
      // 1. Initial local load for immediate perceived performance
      const local = localStorage.getItem('tara_site_config');
      if (local) {
        try { setContent(prev => ({ ...prev, ...JSON.parse(local) })); } catch (e) {}
      }

      if (!storage) {
        setIsStorageConfigured(false);
        setIsInitialized(true);
        return;
      }
      setIsStorageConfigured(true);

      // 2. AUTHORITATIVE CLOUD HYDRATION
      try {
        const configRef = ref(storage, 'config/site_config.json');
        const downloadUrl = await getDownloadURL(configRef);
        
        // Anti-Cache String ensures global sync on every visitor's refresh
        const sep = downloadUrl.includes('?') ? '&' : '?';
        const freshUrl = `${downloadUrl}${sep}t=${Date.now()}`;
        
        const response = await fetch(freshUrl);
        if (response.ok) {
          const cloudConfig = await response.json();
          
          setContent(prev => {
            // MERGE: Cloud settings overwrite local defaults completely
            const merged = { 
              ...prev, 
              ...cloudConfig, 
              images: { ...prev.images, ...cloudConfig.images }, // Force nested image merge
              updatedAt: cloudConfig.updatedAt || Date.now() 
            };
            localStorage.setItem('tara_site_config', JSON.stringify(merged));
            return merged;
          });
          console.log("☁️ SiteContext: Authoritative Global Config Loaded.");
        }
      } catch (err: any) {
        console.warn("☁️ SiteContext: Cloud Config check done (might not exist yet).");
      } finally {
        setIsInitialized(true);
      }

      // 3. Sync Image Gallery
      try {
        const galleryListRef = ref(storage, 'gallery/');
        const res = await listAll(galleryListRef);
        const urls = await Promise.all(res.items.map((r: any) => getDownloadURL(r)));
        setContent(prev => ({ ...prev, gallery: [...systemGallery, ...urls] }));
      } catch (e) {}
    };
    initSite();
  }, []);

  const saveToCloud = async (newContent: SiteContent) => {
    const payload = { ...newContent, updatedAt: Date.now() };
    setContent(payload);
    localStorage.setItem('tara_site_config', JSON.stringify(payload));
    
    if (!storage) return;
    try {
      await ensureAuth();
      const configRef = ref(storage, 'config/site_config.json');
      // Strip gallery from cloud config to save space
      const { gallery, ...saveData } = payload;
      await uploadString(configRef, JSON.stringify(saveData), 'raw', { contentType: 'application/json' });
      console.log("🚀 SiteContext: Broadcaster updated cloud registry.");
    } catch (e) {
      console.error("🚀 SiteContext: Broadcast failed.", e);
    }
  };

  const updateHomeContent = async (key: keyof SiteContent['home'], value: any) => {
    await saveToCloud({ ...content, home: { ...content.home, [key]: value } });
  };

  const addCustomSection = async (section: CustomSection) => {
    await saveToCloud({ ...content, customSections: [...content.customSections, section] });
  };

  const removeCustomSection = async (id: string) => {
    await saveToCloud({ ...content, customSections: content.customSections.filter(s => s.id !== id) });
  };

  const updateImage = async (key: string, url: string) => {
    await saveToCloud({ ...content, images: { ...content.images, [key]: url } });
  };

  const uploadToGallery = async (file: File): Promise<void> => {
    if (!storage) throw new Error("Connection failed.");
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
    setAdminPassword(pw);
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
      content, updateHomeContent, addCustomSection, removeCustomSection, updateImage, uploadToGallery, removeFromGallery, logVisit, isAuthenticated, isStorageConfigured, login, logout, changePassword, isInitialized
    }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) throw new Error('Context error');
  return context;
};
