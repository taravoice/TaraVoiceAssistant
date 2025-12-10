
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
  updatedAt: Date.now()
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

  // --- Fetch latest config directly, bypassing cache ---
  const fetchPublicConfig = async () => {
    if (!bucketName) return null;

    const getDirectUrl = (path: string) =>
      `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`;

    try {
      // 1. Fetch pointer file (cache-busted)
      const pointerUrl = `${getDirectUrl('config/current.json')}&t=${Date.now()}`;
      const pointerRes = await fetch(pointerUrl, { cache: 'no-store' });
      
      if (!pointerRes.ok) {
          // If 404, maybe config/site_config.json exists from legacy?
          throw new Error("Pointer file not found");
      }

      const pointerData = await pointerRes.json();
      const versionFilename = pointerData.version;
      // CRITICAL FIX: Default to 0, NOT Date.now(). 
      // If we default to Date.now(), we might overwrite a valid local draft with empty cloud data.
      const updatedAt = pointerData.updatedAt || 0; 

      if (!versionFilename) throw new Error("Invalid pointer file");

      console.log("🔥 Init: Found version:", versionFilename);

      // 2. Fetch actual config file (cache-busted)
      // We use the updatedAt from the pointer to fetch the exact version if possible, or bust cache.
      const configUrl = `${getDirectUrl(`config/${versionFilename}`)}&t=${Date.now()}`;
      const configRes = await fetch(configUrl, { cache: 'no-store' });
      if (!configRes.ok) throw new Error("Config file missing");

      const configData = await configRes.json();

      // 3. Add cache-busting to all image URLs in the object to ensure they load fresh
      // This is purely for display purposes in the current session
      const now = Date.now();
      Object.keys(configData.images || {}).forEach(key => {
        if (configData.images[key]) {
           try {
              const url = configData.images[key];
              if (url.startsWith('http')) {
                  const urlObj = new URL(url);
                  // Only add timestamp if not present or to force update
                  urlObj.searchParams.set('t', now.toString());
                  configData.images[key] = urlObj.toString();
              }
           } catch(e) {}
        }
      });

      return { ...configData, updatedAt };

    } catch (e) {
      console.warn("Could not fetch public config, falling back to legacy file:", e);
      try {
        const legacyUrl = `${getDirectUrl('config/site_config.json')}&t=${Date.now()}`;
        const res = await fetch(legacyUrl, { cache: 'no-store' });
        if (res.ok) return await res.json();
      } catch (err) { }
      return null;
    }
  };

  // --- Initialize site ---
  const initSite = useCallback(async () => {
    if (!storage) {
      console.warn("⚠️ Storage not configured.");
      setIsInitialized(true);
      return;
    }
    setIsStorageConfigured(true);

    // Don't wait for auth to fetch public content
    ensureAuth().catch(() => {});

    const cloudConfig = await fetchPublicConfig();

    if (cloudConfig) {
      const localStr = localStorage.getItem('tara_site_config');
      let localConfig = null;
      if (localStr) {
        try { localConfig = JSON.parse(localStr); } catch (e) { }
      }

      // LOGIC FIX: Compare properly. 
      // If cloudConfig.updatedAt is 0 (missing), localConfig will likely be > 0, so Draft wins.
      if (localConfig && (localConfig.updatedAt || 0) > (cloudConfig.updatedAt || 0)) {
        console.log("📝 Init: Local draft is newer. Resuming draft.");
        // Merge cloud gallery into local content just in case
        setContent({ 
            ...cloudConfig, 
            ...localConfig, 
            gallery: cloudConfig.gallery || [] 
        });
        setHasUnsavedChanges(true);
      } else {
        console.log("☁️ Init: Cloud is newer. Syncing.");
        setContent({ ...initialContent, ...cloudConfig });
        localStorage.setItem('tara_site_config', JSON.stringify({ ...initialContent, ...cloudConfig }));
        setHasUnsavedChanges(false);
      }
    } else {
      console.log("❌ Init: No cloud config found. Using defaults.");
    }

    // Load gallery images in background
    setTimeout(async () => {
      try {
        await ensureAuth();
        if (!storage) return;

        const listRef = ref(storage, 'gallery/');
        const res = await listAll(listRef);
        const urls = await Promise.all(res.items.map(async r => {
          const u = await getDownloadURL(r);
          // Append timestamp to gallery thumbnails to ensure admin sees latest
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
    // Robust cleaning: remove 't' and 'nocache' but keep 'alt' and 'token'
    let cleanUrl = url;
    try {
       const urlObj = new URL(url);
       // Ensure we remove old timestamps so the Publish timestamp takes precedence
       urlObj.searchParams.delete('t');
       urlObj.searchParams.delete('nocache');
       // But KEEP the token and alt param!
       cleanUrl = urlObj.toString();
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
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'svg') mimeType = 'image/svg+xml';
    }

    const metadata = { contentType: mimeType, cacheControl: 'public, max-age=31536000' };
    const snap = await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(snap.ref);
    
    // Add timestamp for immediate feedback in gallery UI
    const displayUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    setContent(prev => ({ ...prev, gallery: [displayUrl, ...prev.gallery] }));
  };

  const removeFromGallery = async (url: string) => {
     if (!storage) return;
     try {
       await ensureAuth();
       // Try to extract path from URL
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
