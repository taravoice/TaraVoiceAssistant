
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
  updatedAt: 0 // Initialize to 0 so any loaded content is newer
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

  // DIRECT HTTP FETCH STRATEGY (Non-Blocking)
  const fetchPublicConfig = async () => {
    if (!bucketName) return null;
    
    // Explicitly ask for alt=media to get file content, NOT metadata
    const getDirectUrl = (path: string) => 
       `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`;

    try {
        // 1. Fetch Pointer File (Aggressive Cache-Busting)
        const pointerUrl = `${getDirectUrl('config/current.json')}&t=${Date.now()}`;
        const pointerRes = await fetch(pointerUrl, { cache: 'no-store' });
        
        if (!pointerRes.ok) throw new Error("Pointer not found");
        
        const pointerData = await pointerRes.json();
        const versionFilename = pointerData.version;

        if (!versionFilename) throw new Error("Invalid pointer data");

        // 2. Fetch Actual Config
        const configUrl = getDirectUrl(`config/${versionFilename}`);
        const configRes = await fetch(configUrl);
        
        if (!configRes.ok) throw new Error("Config file missing");
        
        return await configRes.json();

    } catch (e) {
        // 3. Fallback: Try legacy site_config.json
        try {
            const legacyUrl = `${getDirectUrl('config/site_config.json')}&t=${Date.now()}`;
            const res = await fetch(legacyUrl);
            if (res.ok) return await res.json();
        } catch (err) {}
        
        return null;
    }
  };

  const initSite = useCallback(async () => {
    if (storage) {
        setIsStorageConfigured(true);
        // Attempt auth in background, don't await/block
        ensureAuth().catch(() => {});
    }

    // A. Load Local Config (Draft)
    const localStr = localStorage.getItem('tara_site_config');
    let localConfig: SiteContent | null = null;
    if (localStr) {
        try { localConfig = JSON.parse(localStr); } catch(e) {}
    }

    // B. Load Cloud Config via Direct HTTP
    const cloudConfig = await fetchPublicConfig();

    if (cloudConfig) {
        // IMPORTANT: If cloudConfig lacks a timestamp, default to 0 (Old).
        // Do NOT default to Date.now(), or it will overwrite local drafts!
        const cloudTimestamp = cloudConfig.updatedAt || 0;

        const cloudContent = {
             ...initialContent,
             ...cloudConfig,
             images: { ...initialContent.images, ...cloudConfig.images },
             updatedAt: cloudTimestamp,
             gallery: content.gallery 
        };

        // C. Decision Logic: Cloud vs Local
        // If Local Draft exists and is NEWER than cloud, keep local.
        if (localConfig && (localConfig.updatedAt > cloudTimestamp)) {
             console.log("📝 Init: Local draft is newer. Restoring Draft.");
             setContent({
                 ...cloudContent, 
                 ...localConfig, // Overwrite with local changes
                 gallery: content.gallery
             });
             setHasUnsavedChanges(true);
        } else {
             console.log("☁️ Init: Synced from Cloud.");
             setContent(cloudContent);
             // Update local mirror to match cloud so we don't have a stale 'draft'
             localStorage.setItem('tara_site_config', JSON.stringify(cloudContent));
             setHasUnsavedChanges(false);
        }
    } else {
        // D. Cloud Failed? Use Local if available
        if (localConfig) {
            console.warn("⚠️ Init: Cloud unreachable. Using Local Draft.");
            setContent({ ...initialContent, ...localConfig });
            setHasUnsavedChanges(true);
        } else {
            console.log("❌ Init: No config found. Using defaults.");
        }
    }

    // E. Lazy Load Gallery
    if (storage) {
        setTimeout(async () => {
            try {
                await ensureAuth();
                const listRef = ref(storage, 'gallery/');
                const res = await listAll(listRef);
                const urls = await Promise.all(res.items.map(async (r) => {
                    const u = await getDownloadURL(r);
                    return `${u}${u.includes('?') ? '&' : '?'}t=${Date.now()}`;
                }));
                setContent(prev => ({ ...prev, gallery: urls }));
            } catch (e) {}
        }, 1000);
    }

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
    // Robust URL Cleaning
    // Remove query params (like 't') but PRESERVE 'alt=media' and 'token'
    let cleanUrl = url;
    
    try {
       const urlObj = new URL(url);
       const params = new URLSearchParams(urlObj.search);
       
       // Remove cache busters
       params.delete('t');
       params.delete('nocache');

       // CRITICAL: Ensure alt=media is present for Firebase URLs
       if (url.includes('firebasestorage.googleapis.com') && !params.has('alt')) {
           params.set('alt', 'media');
       }
       
       urlObj.search = params.toString();
       cleanUrl = urlObj.toString();
    } catch (e) {
       // If URL parsing fails, stick with original
       console.warn("URL parsing failed, using original", e);
    }

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
    
    // Auto-detect mime type
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    }

    const metadata = {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000'
    };
    
    const snap = await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(snap.ref);
    
    // Add timestamp for immediate UI refresh in Gallery
    const displayUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    
    setContent(prev => ({ ...prev, gallery: [displayUrl, ...prev.gallery] }));
  };

  const removeFromGallery = async (url: string) => {
     if (!storage) return;
     try {
       await ensureAuth();
       // Only try to delete if it's a firebase URL
       if (url.includes('firebasestorage.googleapis.com')) {
          // Need to reconstruct ref from URL
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
