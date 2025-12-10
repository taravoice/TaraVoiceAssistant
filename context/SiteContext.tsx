
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, ensureAuth, bucketName } from '../firebase';
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

  // --- 1. Public Fetch (Fast, No Auth) ---
  const fetchPublicConfig = async () => {
    if (!bucketName) return null;
    const getDirectUrl = (path: string) =>
      `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`;

    try {
      const pointerUrl = `${getDirectUrl('config/current.json')}&t=${Date.now()}`;
      const pointerRes = await fetch(pointerUrl, { cache: 'no-store' });
      if (!pointerRes.ok) throw new Error("Pointer fetch failed");

      const pointerData = await pointerRes.json();
      const versionFilename = pointerData.version;
      
      if (!versionFilename) throw new Error("Invalid pointer");
      console.log("🔥 HTTP Init: Found version:", versionFilename);

      const configUrl = `${getDirectUrl(`config/${versionFilename}`)}&t=${Date.now()}`;
      const configRes = await fetch(configUrl, { cache: 'no-store' });
      if (!configRes.ok) throw new Error("Config fetch failed");

      return await configRes.json();
    } catch (e) {
      console.warn("HTTP Init Failed:", e);
      return null;
    }
  };

  // --- 2. SDK Fetch (Fallback, Auth Required) ---
  const fetchSDKConfig = async () => {
    if (!storage) return null;
    try {
       await ensureAuth();
       // Fetch pointer
       const pointerRef = ref(storage, 'config/current.json');
       const pointerUrl = await getDownloadURL(pointerRef);
       const pointerRes = await fetch(`${pointerUrl}&t=${Date.now()}`);
       const pointerData = await pointerRes.json();
       
       if (pointerData.version) {
          console.log("🛡️ SDK Init: Found version:", pointerData.version);
          const configRef = ref(storage, `config/${pointerData.version}`);
          const configUrl = await getDownloadURL(configRef);
          const configRes = await fetch(`${configUrl}&t=${Date.now()}`);
          return await configRes.json();
       }
    } catch (e) {
       console.warn("SDK Init Failed:", e);
    }
    return null;
  };

  // --- Initialize site ---
  const initSite = useCallback(async () => {
    if (!storage) {
      console.warn("⚠️ Storage not configured.");
      setIsInitialized(true);
      return;
    }
    setIsStorageConfigured(true);

    // 1. Try Public HTTP Fetch first
    let cloudConfig = await fetchPublicConfig();

    // 2. If Public failed, try SDK (Authenticated)
    if (!cloudConfig) {
       cloudConfig = await fetchSDKConfig();
    }

    // 3. Load Local Draft
    const localStr = localStorage.getItem('tara_site_config');
    let localConfig = null;
    if (localStr) {
      try { localConfig = JSON.parse(localStr); } catch (e) { }
    }

    if (cloudConfig) {
       // Cloud Found: Decide between Cloud and Draft
       if (localConfig && (localConfig.updatedAt || 0) > (cloudConfig.updatedAt || 0)) {
         console.log("📝 Init: Local draft is newer. Resuming draft.");
         setContent({ ...cloudConfig, ...localConfig, gallery: cloudConfig.gallery || [] });
         setHasUnsavedChanges(true);
       } else {
         console.log("☁️ Init: Synced to Cloud.");
         setContent({ ...initialContent, ...cloudConfig });
         localStorage.setItem('tara_site_config', JSON.stringify({ ...initialContent, ...cloudConfig }));
         setHasUnsavedChanges(false);
       }
    } else {
       // No Cloud Data Available (Error/Offline) -> FORCE LOCAL FALLBACK
       if (localConfig) {
          console.log("⚠️ Init: Cloud unreachable. Forcing local draft.");
          setContent({ ...initialContent, ...localConfig });
          setHasUnsavedChanges(true); // Treat as unsaved since unverified
       } else {
          console.log("❌ Init: No data found anywhere.");
       }
    }

    // Background Gallery Load
    setTimeout(async () => {
      try {
        await ensureAuth();
        if (!storage) return;
        const listRef = ref(storage, 'gallery/');
        const res = await listAll(listRef);
        const urls = await Promise.all(res.items.map(async r => {
          const u = await getDownloadURL(r);
          return `${u}${u.includes('?') ? '&' : '?'}t=${Date.now()}`;
        }));
        setContent(prev => ({ ...prev, gallery: urls }));
      } catch (e) { }
    }, 1000);

    setIsInitialized(true);
  }, []);

  useEffect(() => {
    initSite();
  }, [initSite]);

  const saveToCloud = useCallback(async (newContent: SiteContent) => {
    if (!storage) throw new Error("Storage not configured.");
    
    await ensureAuth();
    const { gallery, ...saveData } = newContent;
    const timestamp = Date.now();
    
    // 1. Versioned Config
    const versionFilename = `site_config_v_${timestamp}.json`;
    const versionRef = ref(storage, `config/${versionFilename}`);
    
    await uploadString(versionRef, JSON.stringify(saveData), 'raw', {
      contentType: 'application/json',
      cacheControl: 'public, max-age=31536000',
      customMetadata: { version: String(timestamp) }
    });

    // 2. Pointer
    const pointerRef = ref(storage, 'config/current.json');
    await uploadString(pointerRef, JSON.stringify({ version: versionFilename, updatedAt: timestamp }), 'raw', {
      contentType: 'application/json',
      cacheControl: 'no-cache, no-store, max-age=0'
    });
    
    console.log("☁️ Published version:", versionFilename);
    setSyncError(null);
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
     
     await saveToCloud(contentToPublish);
     
     setContent(contentToPublish);
     setHasUnsavedChanges(false);
     localStorage.setItem('tara_site_config', JSON.stringify(contentToPublish));
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
    // Robust URL cleaning: remove timestamps, but preserve Firebase 'alt=media' and 'token'
    let cleanUrl = url;
    try {
        if (url.includes('firebasestorage')) {
            const urlObj = new URL(url);
            urlObj.searchParams.delete('t'); // Remove cache buster
            urlObj.searchParams.delete('nocache');
            // Do NOT delete 'alt' or 'token'
            cleanUrl = urlObj.toString();
        } else {
            // For external URLs (Unsplash), remove query params if needed or keep
            cleanUrl = url.split('?')[0]; 
        }
    } catch (e) { cleanUrl = url; }

    updateStateAndDraft(prev => ({
      ...prev,
      images: { ...prev.images, [key]: cleanUrl },
      updatedAt: Date.now()
    }));
  };

  const forceSync = async () => { await publishSite(); };

  const uploadToGallery = async (file: File) => {
    if (!storage) throw new Error("Storage not configured");
    await ensureAuth();
    
    const path = `gallery/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const storageRef = ref(storage, path);
    
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'svg') mimeType = 'image/svg+xml';
    }

    const metadata = { contentType: mimeType || 'image/jpeg', cacheControl: 'public, max-age=31536000' };
    const snap = await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(snap.ref);
    
    const displayUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    setContent(prev => ({ ...prev, gallery: [displayUrl, ...prev.gallery] }));
  };

  const removeFromGallery = async (url: string) => {
     if (!storage) return;
     try {
       await ensureAuth();
       let path = url;
       try {
           const urlObj = new URL(url);
           const p = urlObj.pathname.split('/o/')[1];
           if (p) path = decodeURIComponent(p);
       } catch(e) {}
       const r = ref(storage, path);
       await deleteObject(r);
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
  const changePassword = (pw: string) => localStorage.setItem('tara_admin_pw', pw);

  const logVisit = async (path: string) => {
    if (!storage || path.startsWith('/admin')) return;
    try {
       const logRef = ref(storage, `analytics/logs/${Date.now()}.json`);
       const sid = sessionStorage.getItem('t_sid') || Math.random().toString(36).substring(2);
       sessionStorage.setItem('t_sid', sid);
       const data = { path, timestamp: Date.now(), sid, ua: navigator.userAgent };
       uploadString(logRef, JSON.stringify(data), 'raw', { contentType: 'application/json' }).catch(() => {});
    } catch (e) {}
  };

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
