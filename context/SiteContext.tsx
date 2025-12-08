
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
  updatedAt: number; // Added for sync tracking
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
  logo: '/logo-default.png',
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
  ...Object.values(defaultImages).filter(url => url.startsWith('http'))
];

const defaultContent: SiteContent = {
  home: {
    heroTitle: "AI Appointment Setter for Your Business",
    heroSubtitle: "Automate your appointment scheduling and handle customer interactions 24/7 with human-like accuracy. Never miss a lead again.",
    aboutTitle: "About Tara Voice Assistant",
    aboutText: "Tara Voice Assistant is a cutting-edge AI-driven solution designed to empower small and medium-sized businesses with the tools they need to streamline customer interactions.",
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
  
  const [adminPassword, setAdminPassword] = useState(() => {
    return localStorage.getItem('tara_admin_pw') || '987654321';
  });

  useEffect(() => {
    const initSite = async () => {
      // 1. Check LocalStorage for instant paint (Old user/Cache)
      let localTimestamp = 0;
      const cached = localStorage.getItem('tara_site_config');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          localTimestamp = parsed.updatedAt || 0;
          setContent(prev => ({ ...prev, ...parsed }));
        } catch (e) {}
      }

      if (!storage) {
        setIsStorageConfigured(false);
        return;
      }
      setIsStorageConfigured(true);

      // 2. Fetch from Cloud (Absolute Truth)
      try {
        const configRef = ref(storage, 'config/site_config.json');
        const downloadUrl = await getDownloadURL(configRef);
        
        // Clear browser cache for this JSON fetch specifically
        const separator = downloadUrl.includes('?') ? '&' : '?';
        const finalUrl = `${downloadUrl}${separator}nocache=${Date.now()}`;
        
        const response = await fetch(finalUrl);
        if (response.ok) {
          const cloudConfig = await response.json();
          const cloudTimestamp = cloudConfig.updatedAt || 0;

          // Only apply if cloud data is newer or local storage is empty
          if (cloudTimestamp > localTimestamp || localTimestamp === 0) {
            console.log(`☁️ SITE CONTEXT: Cloud sync initiated. (Cloud: ${cloudTimestamp} > Local: ${localTimestamp})`);
            
            setContent(prev => {
              const updated = { 
                ...prev, 
                ...cloudConfig,
                gallery: prev.gallery // Memory gallery items are local to session
              };
              // Persist cloud truth to local storage for this device
              localStorage.setItem('tara_site_config', JSON.stringify(updated));
              return updated;
            });
          } else {
            console.log("☁️ SITE CONTEXT: Local state is already up-to-date with cloud.");
          }
        }
      } catch (error: any) {
        if (error.code === 'storage/object-not-found') {
          console.info("☁️ SITE CONTEXT: No existing cloud configuration found.");
        } else {
          console.error("☁️ SITE CONTEXT: Cloud sync failure:", error.message);
        }
      }

      // 3. Sync Image Library for current user
      try {
        const galleryListRef = ref(storage, 'gallery/');
        const res = await listAll(galleryListRef);
        const urls = await Promise.all(
          res.items.map((itemRef: any) => getDownloadURL(itemRef))
        );
        setContent(prev => ({ 
          ...prev, 
          gallery: [...systemGallery, ...urls] 
        }));
      } catch (e) {}
    };
    initSite();
  }, []);

  const persistToCloud = async (newContent: SiteContent) => {
    // Inject current timestamp to force cross-browser sync detection
    const timestampedContent = { ...newContent, updatedAt: Date.now() };

    // 1. Update Local State & Storage
    setContent(timestampedContent);
    localStorage.setItem('tara_site_config', JSON.stringify(timestampedContent));
    
    // 2. Upload JSON to Cloud
    if (!storage) return;
    try {
       await ensureAuth();
       const configRef = ref(storage, 'config/site_config.json');
       const { gallery, ...saveData } = timestampedContent;
       await uploadString(configRef, JSON.stringify(saveData), 'raw', {
           contentType: 'application/json'
       });
       console.log("🚀 SITE CONTEXT: Changes synced to Cloud. Global users will update on next visit.");
    } catch (error) {
       console.error("🚀 SITE CONTEXT: Cloud persist failure.", error);
    }
  };

  const updateHomeContent = async (key: keyof SiteContent['home'], value: any) => {
    const newContent = { ...content, home: { ...content.home, [key]: value } };
    await persistToCloud(newContent);
  };

  const addCustomSection = async (section: CustomSection) => {
    const newContent = { ...content, customSections: [...content.customSections, section] };
    await persistToCloud(newContent);
  };

  const removeCustomSection = async (id: string) => {
    const newContent = { ...content, customSections: content.customSections.filter(s => s.id !== id) };
    await persistToCloud(newContent);
  };

  const updateImage = async (key: string, url: string) => {
    const newContent = { ...content, images: { ...content.images, [key]: url } };
    await persistToCloud(newContent);
  };

  const uploadToGallery = async (file: File): Promise<void> => {
    if (!storage) throw new Error("Storage unreachable.");
    try {
      await ensureAuth();
      const storageRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
      const { uploadBytes: fbUpload } = await import('firebase/storage');
      const snapshot = await fbUpload(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setContent(prev => ({ ...prev, gallery: [downloadURL, ...prev.gallery] }));
    } catch (e) { throw e; }
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
     } catch (e) {}
  };

  const login = (passwordInput: string) => {
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
      const logRef = ref(storage, `analytics/logs/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.json`);
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
  if (!context) throw new Error('useSite error');
  return context;
};
