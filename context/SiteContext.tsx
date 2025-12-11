import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, ensureAuth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

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
  hasUnsavedChanges: boolean;
  publishSite: () => Promise<void>;
  forceSync: () => Promise<void>;
}

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
  aboutTeam: '',
  aboutFuture: '',
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
  updatedAt: 0
};

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<SiteContent>(initialContent);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStorageConfigured, setIsStorageConfigured] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const adminPassword = localStorage.getItem('tara_admin_pw') || '987654321';

  const safeSetItem = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e: any) {
      console.warn(`[SiteContext] Storage Quota Limit. Data in memory only.`);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const MAX_WIDTH = 800; // Optimize for mobile
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // --- INIT ---
  const initSite = useCallback(async () => {
    setIsStorageConfigured(!!storage);

    // 1. Load Local Draft Immediately (Fastest UI response)
    let localConfig: SiteContent | null = null;
    const localStr = localStorage.getItem('tara_site_config');
    if (localStr) {
      try { localConfig = JSON.parse(localStr); } catch (e) {}
    }
    
    // Set initial state from local draft if available
    if (localConfig) {
        setContent(prev => ({ ...prev, ...localConfig }));
    }

    // 2. Try to fetch from Cloud
    let cloudConfig: any = null;
    if (storage) {
       // Attempt non-blocking auth (ignoring errors for public read)
       ensureAuth().catch(() => {});

       try {
           // A. Try Pointer (SDK) - Most robust method
           const pointerRef = ref(storage, 'config/current.json');
           const pointerUrl = await getDownloadURL(pointerRef);
           // Add cache bust to URL
           const pRes = await fetch(`${pointerUrl}${pointerUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
           if (pRes.ok) {
              const pData = await pRes.json();
              if (pData.version) {
                 console.log("[SiteContext] Found version:", pData.version);
                 const vRef = ref(storage, `config/${pData.version}`);
                 const vUrl = await getDownloadURL(vRef);
                 const vRes = await fetch(vUrl);
                 if (vRes.ok) cloudConfig = await vRes.json();
              }
           }
       } catch (e) {
           console.warn("[SiteContext] SDK Fetch failed. Trying Legacy Fallback.", e);
       }
       
       // B. Legacy Fallback (SDK) - If pointer fails
       if (!cloudConfig) {
          try {
             const legacyRef = ref(storage, 'config/site_config.json');
             const lUrl = await getDownloadURL(legacyRef);
             const lRes = await fetch(lUrl);
             if (lRes.ok) cloudConfig = await lRes.json();
          } catch(e) {}
       }
    }

    // 3. Resolve Conflict (Local vs Cloud)
    if (cloudConfig) {
       const cloudTime = cloudConfig.updatedAt || 0;
       const localTime = localConfig?.updatedAt || 0;
       const lastPublished = parseInt(localStorage.getItem('tara_last_published') || '0');

       // Check if local is newer AND different from what we last published
       // Using a small buffer (1000ms) for time comparison
       if (localTime > cloudTime && Math.abs(localTime - lastPublished) > 1000) {
           console.log("[SiteContext] Local Draft is newer. Preserving.");
           setHasUnsavedChanges(true);
           // We already set local content at start, just ensure flags are correct
       } else {
           console.log("[SiteContext] Synced to Cloud.");
           const merged = { 
               ...initialContent, 
               ...cloudConfig, 
               images: { ...initialImages, ...cloudConfig.images },
               gallery: cloudConfig.gallery || []
           };
           setContent(merged);
           safeSetItem('tara_site_config', JSON.stringify(merged));
           safeSetItem('tara_last_published', cloudTime.toString());
           setHasUnsavedChanges(false);
       }
    } else if (localConfig) {
       // Offline mode / Cloud fetch failed but we have local data
       setHasUnsavedChanges(true);
    }
    
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    initSite();
  }, [initSite]);

  const saveToCloud = useCallback(async (newContent: SiteContent) => {
    if (!storage) throw new Error("Storage not configured.");

    const saveData = newContent;
    const timestamp = saveData.updatedAt;
    const jsonString = JSON.stringify(saveData);
    const contentBlob = new Blob([jsonString], { type: 'application/json' });

    // Metadata - Critical for preventing caching
    const noCacheMeta = { contentType: 'application/json', cacheControl: 'no-cache, no-store, max-age=0' };
    const longCacheMeta = { contentType: 'application/json', cacheControl: 'public, max-age=31536000' };

    // 1. Upload Version (Cacheable)
    const versionFilename = `site_config_v_${timestamp}.json`;
    const versionRef = ref(storage, `config/${versionFilename}`);
    await uploadBytes(versionRef, contentBlob, longCacheMeta);

    // 2. Upload Pointer (Never Cache)
    const pointerData = { version: versionFilename, updatedAt: timestamp };
    const pointerBlob = new Blob([JSON.stringify(pointerData)], { type: 'application/json' });
    const pointerRef = ref(storage, 'config/current.json');
    await uploadBytes(pointerRef, pointerBlob, noCacheMeta);

    // 3. Upload Legacy (Backup)
    const legacyRef = ref(storage, 'config/site_config.json');
    await uploadBytes(legacyRef, contentBlob, noCacheMeta);

    setSyncError(null);
  }, []);

  const publishSite = async () => {
     if (!isStorageConfigured) {
        alert("Cannot publish: Storage not configured.");
        return;
     }
     const timestamp = Date.now();
     const contentToPublish = { ...content, updatedAt: timestamp };
     
     // Save locally first
     safeSetItem('tara_last_published', timestamp.toString());
     safeSetItem('tara_site_config', JSON.stringify(contentToPublish));
     setContent(contentToPublish);
     setHasUnsavedChanges(false);

     // Push to cloud
     await saveToCloud(contentToPublish);
  };

  // Helper to update state and save draft
  const updateStateAndDraft = (updater: (prev: SiteContent) => SiteContent) => {
     setContent(prev => {
        const next = updater(prev);
        safeSetItem('tara_site_config', JSON.stringify(next));
        return next;
     });
     setHasUnsavedChanges(true);
  };

  const updateHomeContent = async (key: keyof SiteContent['home'], value: any) => {
    updateStateAndDraft(prev => ({
      ...prev,
      home: { ...prev.home, [key]: value },
      updatedAt: Date.now()
    }));
  };

  const addCustomSection = async (section: CustomSection) => {
    updateStateAndDraft(prev => ({
      ...prev,
      customSections: [...prev.customSections, section],
      updatedAt: Date.now()
    }));
  };

  const removeCustomSection = async (id: string) => {
    updateStateAndDraft(prev => ({
      ...prev,
      customSections: prev.customSections.filter(s => s.id !== id),
      updatedAt: Date.now()
    }));
  };

  const updateImage = async (key: string, url: string) => {
    updateStateAndDraft(prev => ({
      ...prev,
      images: { ...prev.images, [key]: url },
      updatedAt: Date.now()
    }));
  };

  const forceSync = async () => { await publishSite(); };

  const uploadToGallery = async (file: File) => {
    try {
      const base64String = await compressImage(file);
      updateStateAndDraft(prev => ({ 
          ...prev, 
          gallery: [base64String, ...prev.gallery],
          updatedAt: Date.now()
      }));
    } catch (e: any) {
       console.error("Image error:", e);
       alert("Failed to process image: " + e.message);
    }
  };

  const removeFromGallery = async (url: string) => {
     updateStateAndDraft(prev => ({ 
         ...prev, 
         gallery: prev.gallery.filter(i => i !== url),
         updatedAt: Date.now()
     }));
  };

  const login = (input: string) => {
    if (input === adminPassword) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };
  const logout = () => setIsAuthenticated(false);
  const changePassword = (pw: string) => localStorage.setItem('tara_admin_pw', pw);
  const logVisit = async (path: string) => {};

  return (
    <SiteContext.Provider value={{ 
      content, updateHomeContent, addCustomSection, removeCustomSection, 
      updateImage, uploadToGallery, removeFromGallery, logVisit, 
      isAuthenticated, isStorageConfigured, syncError, 
      login, logout, changePassword, isInitialized, hasUnsavedChanges, 
      publishSite, forceSync
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
