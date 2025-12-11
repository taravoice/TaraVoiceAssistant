
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, ensureAuth, bucketName } from '../firebase';
import { ref, uploadBytes } from 'firebase/storage';

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

  // HELPER: Safe LocalStorage Write
  const safeSetItem = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e: any) {
      console.warn(`[SiteContext] Storage Quota Limit. Data in memory only.`);
    }
  };

  // HELPER: Compress Base64
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
          const MAX_WIDTH = 800;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // --- ROBUST HTTP FETCH (Strategy: Pointer -> File) ---
  const fetchLatestConfig = async () => {
      if (!bucketName) return null;

      try {
          // 1. Fetch Pointer (current.json) with CACHE BUSTING
          const t = Date.now();
          const pointerUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/config%2Fcurrent.json?alt=media&t=${t}`;
          
          console.log("[SiteContext] Fetching pointer:", pointerUrl);
          const pointerRes = await fetch(pointerUrl, { cache: 'no-store' });
          
          if (pointerRes.ok) {
              const pointerData = await pointerRes.json();
              if (pointerData.version) {
                  // 2. Fetch the Actual Config File
                  const fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/config%2F${pointerData.version}?alt=media`;
                  console.log("[SiteContext] Downloading config:", pointerData.version);
                  
                  const fileRes = await fetch(fileUrl);
                  if (fileRes.ok) return await fileRes.json();
              }
          }
      } catch (e) {
          console.warn("[SiteContext] Pointer fetch failed, trying legacy...", e);
      }

      // 3. Fallback to Legacy File
      try {
          const legacyUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/config%2Fsite_config.json?alt=media&t=${Date.now()}`;
          const res = await fetch(legacyUrl);
          if (res.ok) return await res.json();
      } catch (e) {}

      return null;
  };

  // --- INIT ---
  const initSite = useCallback(async () => {
    setIsStorageConfigured(!!storage);

    // 1. Try Local Draft
    let localConfig: SiteContent | null = null;
    const localStr = localStorage.getItem('tara_site_config');
    if (localStr) {
      try { localConfig = JSON.parse(localStr); } catch (e) {}
    }

    // 2. Try Cloud
    const cloudConfig = await fetchLatestConfig();

    if (cloudConfig) {
       const cloudTime = cloudConfig.updatedAt || 0;
       const localTime = localConfig?.updatedAt || 0;
       const lastPublished = parseInt(localStorage.getItem('tara_last_published') || '0');

       // Check if we are "Synced"
       if (localTime > cloudTime && Math.abs(localTime - lastPublished) < 2000) {
           console.log("[SiteContext] Synced state verified.");
           setHasUnsavedChanges(false);
           if (localConfig) setContent({ ...initialContent, ...localConfig });
       } 
       else if (localTime > cloudTime) {
           console.log("[SiteContext] Local Draft is newer.");
           setHasUnsavedChanges(true);
           if (localConfig) setContent({ ...initialContent, ...localConfig });
       } else {
           console.log("[SiteContext] Using Cloud Data.");
           // Merge to ensure no data loss
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
    } else {
       // Cloud failed (offline/mobile block), use Local if available
       if (localConfig) {
           setContent({ ...initialContent, ...localConfig });
           setHasUnsavedChanges(true); // Assume unsaved if we can't verify cloud
       }
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    initSite();
  }, [initSite]);

  // --- SAVE ---
  const saveToCloud = useCallback(async (newContent: SiteContent) => {
    if (!storage) throw new Error("Storage not configured.");

    const saveData = newContent;
    const timestamp = saveData.updatedAt;
    const jsonString = JSON.stringify(saveData);
    const contentBlob = new Blob([jsonString], { type: 'application/json' });

    // Metadata: Force NO CACHE on pointer
    const noCacheMeta = { contentType: 'application/json', cacheControl: 'no-cache, no-store, max-age=0' };
    const longCacheMeta = { contentType: 'application/json', cacheControl: 'public, max-age=31536000' };

    // 1. Upload Versioned File (Long Cache)
    const versionFilename = `site_config_v_${timestamp}.json`;
    const versionRef = ref(storage, `config/${versionFilename}`);
    await uploadBytes(versionRef, contentBlob, longCacheMeta);

    // 2. Upload Pointer File (No Cache)
    const pointerData = { version: versionFilename, updatedAt: timestamp };
    const pointerBlob = new Blob([JSON.stringify(pointerData)], { type: 'application/json' });
    const pointerRef = ref(storage, 'config/current.json');
    await uploadBytes(pointerRef, pointerBlob, noCacheMeta);

    // 3. Upload Legacy File (No Cache)
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
     
     safeSetItem('tara_last_published', timestamp.toString());
     safeSetItem('tara_site_config', JSON.stringify(contentToPublish));
     setContent(contentToPublish);
     setHasUnsavedChanges(false);

     await saveToCloud(contentToPublish);
  };

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
