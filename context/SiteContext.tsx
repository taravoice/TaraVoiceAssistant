
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

  // DIRECT HTTP FETCH STRATEGY
  const fetchPublicConfig = async () => {
    if (!bucketName) return null;
    
    const getDirectUrl = (path: string) => 
       `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(path)}?alt=media`;

    try {
        // 1. Fetch Pointer File (Cache-Busted)
        const pointerUrl = `${getDirectUrl('config/current.json')}&t=${Date.now()}`;
        const pointerRes = await fetch(pointerUrl, { cache: 'no-store' });
        
        if (!pointerRes.ok) throw new Error("Pointer not found");
        
        const pointerData = await pointerRes.json();
        const versionFilename = pointerData.version;

        if (!versionFilename) throw new Error("Invalid pointer data");

        console.log("🔥 Init: Found version:", versionFilename);

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
        
        console.warn("Could not fetch public config:", e);
        return null;
    }
  };

  const initSite = useCallback(async () => {
    // Check if we have API keys at all
    if (!storage) {
       console.warn("⚠️ Storage not configured.");
       setIsInitialized(true);
       return;
    }
    setIsStorageConfigured(true);

    // A. Start Auth in Background
    ensureAuth().catch(() => {});

    // B. Load Content immediately via HTTP
    const cloudConfig = await fetchPublicConfig();

    if (cloudConfig) {
        const localStr = localStorage.getItem('tara_site_config');
        let localConfig = null;
        if (localStr) {
           try { localConfig = JSON.parse(localStr); } catch(e) {}
        }

        const cloudContent = {
             ...initialContent,
             ...cloudConfig,
             images: { ...initialContent.images, ...cloudConfig.images },
             updatedAt: cloudConfig.updatedAt || Date.now(),
             gallery: content.gallery 
        };

        // DRAFT LOGIC FIX:
        // Only overwrite if Cloud is newer than Local.
        // If Local has a timestamp > Cloud, it means we have unsaved work.
        if (localConfig && (localConfig.updatedAt > (cloudContent.updatedAt || 0))) {
             console.log("📝 Init: Found newer local draft. Restoring Draft.");
             setContent({
                 ...cloudContent, // Use cloud as base for structure
                 ...localConfig,  // Override with local changes
                 gallery: content.gallery // Keep gallery state
             });
             setHasUnsavedChanges(true);
        } else {
             console.log("☁️ Init: Using Cloud Config.");
             setContent(cloudContent);
             localStorage.setItem('tara_site_config', JSON.stringify(cloudContent));
             setHasUnsavedChanges(false);
        }
    } else {
        console.log("❌ Init: No cloud config found. Using defaults.");
    }

    // C. Load Gallery (Only if Auth succeeds later)
    setTimeout(async () => {
        try {
            await ensureAuth(); 
            if (storage) {
                const listRef = ref(storage, 'gallery/');
                const res = await listAll(listRef);
                const urls = await Promise.all(res.items.map(async (r) => {
                    const u = await getDownloadURL(r);
                    return `${u}${u.includes('?') ? '&' : '?'}t=${Date.now()}`;
                }));
                setContent(prev => ({ ...prev, gallery: urls }));
            }
        } catch (e) { /* Not an admin, ignore */ }
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
    // Robust URL Cleaning
    // Goal: Remove 't=' param but KEEP 'alt=media' and 'token='
    let cleanUrl = url;
    
    try {
       const urlObj = new URL(url);
       // Delete our custom params
       urlObj.searchParams.delete('t');
       urlObj.searchParams.delete('nocache');
       
       // Ensure alt=media exists if it's a firebase storage URL
       if (url.includes('firebasestorage.googleapis.com')) {
           if (!urlObj.searchParams.has('alt')) {
               urlObj.searchParams.set('alt', 'media');
           }
       }
       cleanUrl = urlObj.toString();
    } catch (e) {
       // Fallback for relative URLs or errors
       cleanUrl = url; 
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
        else if (ext === 'webp') mimeType = 'image/webp';
        else if (ext === 'svg') mimeType = 'image/svg+xml';
    }

    const metadata = {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000'
    };
    
    const snap = await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(snap.ref);
    
    // Add timestamp for immediate UI refresh
    const displayUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    
    setContent(prev => ({ ...prev, gallery: [displayUrl, ...prev.gallery] }));
  };

  const removeFromGallery = async (url: string) => {
     if (!storage) return;
     try {
       await ensureAuth();
       const r = ref(storage, url);
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
