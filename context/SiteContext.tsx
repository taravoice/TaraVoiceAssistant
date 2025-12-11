
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, ensureAuth } from '../firebase';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';

export interface CustomSection {
  id: string;
  title: string;
  content: string;
  image?: string; // Not used in static mode, but kept for type compatibility
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
  gallery: string[]; // Unused in static mode
  updatedAt: number;
}

interface SiteContextType {
  content: SiteContent;
  updateHomeContent: (key: keyof SiteContent['home'], value: any) => Promise<void>;
  addCustomSection: (section: CustomSection) => Promise<void>;
  removeCustomSection: (id: string) => Promise<void>;
  updateImage: (key: string, url: string) => Promise<void>; // Deprecated
  uploadToGallery: (file: File) => Promise<void>; // Deprecated
  removeFromGallery: (url: string) => Promise<void>; // Deprecated
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

// STATIC FILE MAPPING
// These paths correspond to files you must upload to 'public/images/' in your GitHub repo.
const staticImageMap: SiteImages = {
  logo: '/logo.png', // Root level
  homeHeroBg: '/images/home_hero.png',
  homeIndustry1: '/images/industry_1.png',
  homeIndustry2: '/images/industry_2.png',
  feature1: '/images/feature_1.gif',
  feature2: '/images/feature_2.gif',
  feature3: '/images/feature_3.gif',
  feature4: '/images/feature_4.gif',
  feature5: '/images/feature_5.gif',
  feature6: '/images/feature_6.gif',
  aboutTeam: '/images/about_team.png',
  aboutFuture: '/images/about_future.png',
};

const initialContent: SiteContent = {
  home: {
    heroTitle: "AI Appointment Setter for Your Business",
    heroSubtitle: "Automate your scheduling 24/7 with human-like accuracy.",
    aboutTitle: "About Tara Voice Assistant",
    aboutText: "Tara is a cutting-edge AI solution designed for SMBs.",
  },
  customSections: [],
  images: staticImageMap,
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

  // Helper for mobile storage safety
  const safeSetItem = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch (e) {}
  };

  const initSite = useCallback(async () => {
    setIsStorageConfigured(!!storage);

    // 1. Check Local Draft for TEXT changes (Images are static now)
    let localConfig: SiteContent | null = null;
    try {
      const localStr = localStorage.getItem('tara_site_config');
      if (localStr) localConfig = JSON.parse(localStr);
    } catch (e) {}

    // 2. Fetch Cloud Text Config
    if (storage) {
       ensureAuth().catch(() => {}); // Non-blocking auth

       try {
           // Direct Pointer Fetch Strategy
           const pointerRef = ref(storage, 'config/current.json');
           const pointerUrl = await getDownloadURL(pointerRef);
           const pRes = await fetch(pointerUrl + `?t=${Date.now()}`); // Cache bust pointer
           
           if (pRes.ok) {
              const pData = await pRes.json();
              if (pData.version) {
                 const vRef = ref(storage, `config/${pData.version}`);
                 const vUrl = await getDownloadURL(vRef);
                 const vRes = await fetch(vUrl);
                 
                 if (vRes.ok) {
                    const cloudConfig = await vRes.json();
                    
                    // MERGE LOGIC: 
                    // 1. Keep Cloud Text
                    // 2. FORCE Static Images (Ignore cloud images)
                    const merged = { 
                        ...initialContent, 
                        ...cloudConfig,
                        images: staticImageMap // Force static paths
                    };
                    
                    // Check draft status
                    const cloudTime = cloudConfig.updatedAt || 0;
                    const localTime = localConfig?.updatedAt || 0;
                    
                    if (localTime > cloudTime) {
                        setHasUnsavedChanges(true);
                        // If local exists, use it, but ensure images are static
                        if (localConfig) {
                            setContent({ ...localConfig, images: staticImageMap });
                        }
                    } else {
                        setContent(merged);
                        safeSetItem('tara_site_config', JSON.stringify(merged));
                        setHasUnsavedChanges(false);
                    }
                 }
              }
           }
       } catch (e) {
           console.warn("Cloud config load failed, using defaults/local", e);
       }
    }
    
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    initSite();
  }, [initSite]);

  const saveToCloud = useCallback(async (newContent: SiteContent) => {
    if (!storage) throw new Error("Storage not configured.");

    // Enforce static images before saving (Clean any accidental URLs)
    const saveData = { ...newContent, images: staticImageMap };
    
    const timestamp = saveData.updatedAt;
    const contentBlob = new Blob([JSON.stringify(saveData)], { type: 'application/json' });

    // Strict Metadata
    const meta = { contentType: 'application/json', cacheControl: 'no-cache, no-store, max-age=0' };

    // 1. Versioned File
    const versionFilename = `site_config_v_${timestamp}.json`;
    const versionRef = ref(storage, `config/${versionFilename}`);
    await uploadBytes(versionRef, contentBlob, meta);

    // 2. Pointer File
    const pointerData = { version: versionFilename, updatedAt: timestamp };
    const pointerRef = ref(storage, 'config/current.json');
    await uploadBytes(pointerRef, new Blob([JSON.stringify(pointerData)], { type: 'application/json' }), meta);

    setSyncError(null);
  }, []);

  const publishSite = async () => {
     if (!isStorageConfigured) {
        alert("Cannot publish: Storage not configured.");
        return;
     }
     const timestamp = Date.now();
     const contentToPublish = { ...content, updatedAt: timestamp, images: staticImageMap };
     
     setContent(contentToPublish);
     setHasUnsavedChanges(false);
     safeSetItem('tara_site_config', JSON.stringify(contentToPublish));

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

  // Deprecated Image Functions (No-ops)
  const updateImage = async () => { console.log("Images are now managed via GitHub files."); };
  const uploadToGallery = async () => { alert("Please upload images directly to GitHub 'public/images/' folder."); };
  const removeFromGallery = async () => { };
  const forceSync = async () => { await publishSite(); };
  
  const login = (input: string) => {
    if (input === adminPassword) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };
  const logout = () => setIsAuthenticated(false);
  const changePassword = (pw: string) => localStorage.setItem('tara_admin_pw', pw);
  const logVisit = async () => {};

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
