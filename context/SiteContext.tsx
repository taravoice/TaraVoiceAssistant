import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage, ensureAuth } from '../firebase';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject, uploadString } from 'firebase/storage';

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
}

const defaultImages: SiteImages = {
  logo: '/logo.png',
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

const systemGallery = [
  '/logo.png',
  ...Object.values(defaultImages).filter(url => url.startsWith('http'))
];

const defaultContent: SiteContent = {
  home: {
    heroTitle: "AI Appointment Setter for Your Business",
    heroSubtitle: "Automate your appointment scheduling and handle customer interactions 24/7 with human-like accuracy. Never miss a lead again.",
    aboutTitle: "About Tara Voice Assistant",
    aboutText: "Tara Voice Assistant is a cutting-edge AI-driven solution designed to empower small and medium-sized businesses with the tools they need to streamline customer interactions. It handles appointment scheduling, answers customer inquiries, and manages call-related tasks with human-like accuracy 24/7.",
  },
  customSections: [],
  images: defaultImages,
  gallery: systemGallery
};

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStorageConfigured, setIsStorageConfigured] = useState(false);
  
  const [adminPassword, setAdminPassword] = useState(() => {
    return localStorage.getItem('tara_admin_pw') || '987654321';
  });

  useEffect(() => {
    const initSite = async () => {
      // 1. Load Local Storage for immediate UI paint
      const localConfig = localStorage.getItem('tara_site_config');
      if (localConfig) {
          try {
              const parsed = JSON.parse(localConfig);
              setContent(prev => ({ ...prev, ...parsed, gallery: prev.gallery }));
          } catch (e) {
              console.error("Local config parse error", e);
          }
      }

      if (!storage) {
        setIsStorageConfigured(false);
        return;
      }

      setIsStorageConfigured(true);

      // 2. Fetch Global Source of Truth from cloud
      try {
        const configRef = ref(storage, 'config/site_config.json');
        const url = await getDownloadURL(configRef);
        // FORCE CACHE BUSTING for other browsers
        const response = await fetch(`${url}?t=${Date.now()}`);
        if (response.ok) {
            const savedConfig = await response.json();
            setContent(prev => {
                const merged = { ...prev, ...savedConfig, gallery: prev.gallery };
                localStorage.setItem('tara_site_config', JSON.stringify(merged));
                return merged;
            });
            console.log("☁️ Global Configuration Hydrated for all browsers");
        }
      } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
            console.warn("Global config fetch warning:", error);
        }
      }

      // 3. Fetch Gallery items
      try {
        const listRef = ref(storage, 'gallery/');
        const res = await listAll(listRef);
        const urls = await Promise.all(
          res.items.map((itemRef: any) => getDownloadURL(itemRef))
        );
        setContent(prev => ({ ...prev, gallery: [...systemGallery, ...urls] }));
      } catch (error) {
        console.warn("Gallery fetch warning:", error);
      }
    };
    initSite();
  }, []);

  const persistContent = async (newContent: SiteContent) => {
      // Sync local browser instantly
      localStorage.setItem('tara_site_config', JSON.stringify(newContent));
      
      if (!storage) return;
      try {
         await ensureAuth();
         const configRef = ref(storage, 'config/site_config.json');
         const { gallery, ...configToSave } = newContent;
         await uploadString(configRef, JSON.stringify(configToSave), 'raw', {
             contentType: 'application/json'
         });
         console.log("🚀 Configuration Synced to Firebase for all browsers");
      } catch (error) {
         console.error("Failed to save config to cloud:", error);
      }
  };

  const updateHomeContent = async (key: keyof SiteContent['home'], value: any) => {
    const newContent = { ...content, home: { ...content.home, [key]: value } };
    setContent(newContent);
    await persistContent(newContent);
  };

  const addCustomSection = async (section: CustomSection) => {
    const newContent = { ...content, customSections: [...content.customSections, section] };
    setContent(newContent);
    await persistContent(newContent);
  };

  const removeCustomSection = async (id: string) => {
    const newContent = { ...content, customSections: content.customSections.filter(s => s.id !== id) };
    setContent(newContent);
    await persistContent(newContent);
  };

  const updateImage = async (key: string, url: string) => {
    const newContent = { ...content, images: { ...content.images, [key]: url } };
    setContent(newContent);
    await persistContent(newContent);
  };

  const uploadToGallery = async (file: File): Promise<void> => {
    if (!storage) {
      alert("Storage not configured.");
      throw new Error("No storage");
    }
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Upload timed out (30s). Check Bucket Name in Env Vars.`)), 30000);
    });
    try {
      await ensureAuth();
      const storageRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
      const snapshot = await Promise.race([uploadBytes(storageRef, file), timeoutPromise]) as any;
      const downloadURL = await getDownloadURL(snapshot.ref);
      setContent(prev => ({ ...prev, gallery: [downloadURL, ...prev.gallery] }));
    } catch (error) {
      console.error("Upload failed", error);
      throw error;
    }
  };

  const removeFromGallery = async (url: string) => {
     if (!storage) return;
     try {
       await ensureAuth();
       if (url.includes('firebasestorage.googleapis.com')) {
         const storageRef = ref(storage, url);
         await deleteObject(storageRef);
       }
       setContent(prev => ({ ...prev, gallery: prev.gallery.filter(item => item !== url) }));
     } catch (error) {
       console.error("Delete failed", error);
     }
  };

  const login = (passwordInput: string): boolean => {
    if (passwordInput === adminPassword) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => setIsAuthenticated(false);

  const changePassword = (newPassword: string) => {
    setAdminPassword(newPassword);
    localStorage.setItem('tara_admin_pw', newPassword);
  };

  const logVisit = async (path: string) => {
    if (!storage || path.startsWith('/admin')) return;
    try {
      await ensureAuth();
      let sessionId = sessionStorage.getItem('tara_session_id') || Math.random().toString(36).substring(2);
      sessionStorage.setItem('tara_session_id', sessionId);
      const logData = { path, timestamp: Date.now(), sessionId, userAgent: navigator.userAgent };
      const filename = `analytics/logs/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.json`;
      const logRef = ref(storage, filename);
      await uploadString(logRef, JSON.stringify(logData), 'raw', { contentType: 'application/json' });
    } catch (err) {}
  };

  return (
    <SiteContext.Provider value={{ 
      content, updateHomeContent, addCustomSection, removeCustomSection, updateImage, uploadToGallery, removeFromGallery, logVisit, isAuthenticated, isStorageConfigured, login, logout, changePassword
    }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) throw new Error('useSite must be used within a SiteProvider');
  return context;
};
