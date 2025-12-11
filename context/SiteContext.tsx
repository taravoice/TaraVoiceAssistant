
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, ensureAuth, bucketName } from '../firebase';
import { ref, getDownloadURL, listAll, uploadBytes, updateMetadata } from 'firebase/storage';

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

  // HELPER: Compress and Convert to Base64
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
          
          // Max width 1000px to save space
          const MAX_WIDTH = 1000;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG 70% quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // --- ROBUST FETCH STRATEGY ---
  const fetchLatestConfig = async () => {
      let fetchedConfig = null;

      // Strategy A: LIST ALL FILES (The "Truth" Strategy)
      if (storage) {
          try {
             console.log("[SiteContext] Strategy A: Listing config folder...");
             const configListRef = ref(storage, 'config/');
             const res = await listAll(configListRef);
             
             const versionFiles = res.items.filter(item => item.name.startsWith('site_config_v_'));
             
             if (versionFiles.length > 0) {
                 versionFiles.sort((a, b) => {
                     const timeA = parseInt(a.name.split('_v_')[1] || '0');
                     const timeB = parseInt(b.name.split('_v_')[1] || '0');
                     return timeB - timeA;
                 });
                 console.log("[SiteContext] Found latest version via List:", versionFiles[0].name);
                 const url = await getDownloadURL(versionFiles[0]);
                 const response = await fetch(url);
                 if (response.ok) fetchedConfig = await response.json();
             }
          } catch (e) {
             console.warn("[SiteContext] Strategy A failed", e);
          }
      }

      if (fetchedConfig) return fetchedConfig;

      // Strategy B: LEGACY HTTP FETCH (Fallback)
      if (bucketName) {
          try {
              console.log("[SiteContext] Strategy B: Fetching legacy backup via HTTP...");
              const timestamp = Date.now();
              const random = Math.random().toString(36).substring(7);
              const legacyUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/config%2Fsite_config.json?alt=media&t=${timestamp}_${random}`;
              
              const res = await fetch(legacyUrl, { cache: 'no-store' });
              if (res.ok) return await res.json();
          } catch (e) {
              console.warn("[SiteContext] Strategy B failed", e);
          }
      }

      return null;
  };

  // --- Initialize site ---
  const initSite = useCallback(async () => {
    setIsStorageConfigured(!!storage);

    // 1. Load Local Draft First (Instant UI)
    const localStr = localStorage.getItem('tara_site_config');
    let localConfig: SiteContent | null = null;
    if (localStr) {
      try { 
          localConfig = JSON.parse(localStr);
          if (localConfig) setContent(prev => ({ ...prev, ...localConfig }));
      } catch (e) {}
    }

    // 2. Fetch Latest from Cloud
    const cloudConfig = await fetchLatestConfig();

    if (cloudConfig) {
       const cloudTime = cloudConfig.updatedAt || 0;
       const localTime = localConfig?.updatedAt || 0;
       
       // SYNC LOGIC
       if (localTime > cloudTime) {
           const lastPublished = parseInt(localStorage.getItem('tara_last_published') || '0');
           if (Math.abs(localTime - lastPublished) < 2000) {
               console.log("[SiteContext] Synced (Local matches last published).");
               setHasUnsavedChanges(false);
           } else {
               console.log("[SiteContext] Local Draft is newer. Keeping Draft.");
               setHasUnsavedChanges(true);
           }
       } 
       else {
           console.log("[SiteContext] Cloud is newer/equal. Syncing.");
           const merged = { 
               ...initialContent, 
               ...cloudConfig,
               // Trust cloud images since they are now embedded data
               images: { ...initialImages, ...cloudConfig.images }
           };
           
           setContent(merged);
           localStorage.setItem('tara_site_config', JSON.stringify(merged));
           setHasUnsavedChanges(false);
           localStorage.setItem('tara_last_published', cloudTime.toString());
       }
    } else {
       console.log("[SiteContext] Failed to load cloud config. Staying with local or default.");
       if (localConfig) setHasUnsavedChanges(true);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    initSite();
  }, [initSite]);

  const saveToCloud = useCallback(async (newContent: SiteContent) => {
    if (!storage) throw new Error("Storage not configured.");
    
    // We strictly use uploadBytes now
    const { gallery, ...saveData } = newContent;
    const timestamp = saveData.updatedAt; 
    
    const jsonString = JSON.stringify(saveData);
    const contentBlob = new Blob([jsonString], { type: 'application/json' });
    
    const immutableMetadata = {
        contentType: 'application/json',
        cacheControl: 'public, max-age=31536000',
        customMetadata: { version: String(timestamp) }
    };

    const noCacheMetadata = {
        contentType: 'application/json',
        cacheControl: 'no-cache, no-store, max-age=0'
    };
    
    // 1. Versioned Config
    const versionRef = ref(storage, `config/site_config_v_${timestamp}.json`);
    await uploadBytes(versionRef, contentBlob, immutableMetadata);

    // 2. Legacy Backup (Crucial for fallback)
    const legacyRef = ref(storage, 'config/site_config.json');
    await uploadBytes(legacyRef, contentBlob, noCacheMetadata);
    
    setSyncError(null);
    console.log("☁️ SITE CONTEXT: Saved successfully (Base64 Mode).");
  }, []);

  const publishSite = async () => {
     if (!isStorageConfigured) {
        alert("Cannot publish: Storage not configured.");
        return;
     }
     
     const timestamp = Date.now();
     const contentToPublish = {
       ...content,
       updatedAt: timestamp
     };
     
     localStorage.setItem('tara_last_published', timestamp.toString());
     localStorage.setItem('tara_site_config', JSON.stringify(contentToPublish));
     setContent(contentToPublish);
     setHasUnsavedChanges(false);

     await saveToCloud(contentToPublish);
  };

  const updateStateAndDraft = (updater: (prev: SiteContent) => SiteContent) => {
     setContent(prev => {
        const next = updater(prev);
        localStorage.setItem('tara_site_config', JSON.stringify(next));
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
    // In Base64 mode, 'url' is the base64 string. No cleaning needed.
    updateStateAndDraft(prev => ({
      ...prev,
      images: { ...prev.images, [key]: url },
      updatedAt: Date.now()
    }));
  };

  const forceSync = async () => { await publishSite(); };

  const uploadToGallery = async (file: File) => {
    try {
      // COMPRESS AND CONVERT TO BASE64
      // This bypasses Firebase Storage for images entirely.
      const base64String = await compressImage(file);
      
      // Store locally in the gallery array
      // Note: We are prepending to the gallery list in the config
      setContent(prev => ({ 
          ...prev, 
          gallery: [base64String, ...prev.gallery] 
      }));
      
      // Trigger a draft save so it persists
      setHasUnsavedChanges(true);
      
    } catch (e: any) {
       console.error("Image processing failed:", e);
       alert("Failed to process image: " + e.message);
    }
  };

  const removeFromGallery = async (url: string) => {
     // Just filter it out of the array
     setContent(prev => ({ ...prev, gallery: prev.gallery.filter(i => i !== url) }));
     setHasUnsavedChanges(true);
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
