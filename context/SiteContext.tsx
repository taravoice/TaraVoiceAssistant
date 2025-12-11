
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

  // HELPER: Self-Healing URL Fixer
  // If an image URL is missing 'alt=media', it won't load. This fixes it.
  const fixUrl = (u: string) => {
      if (!u || typeof u !== 'string' || !u.includes('firebasestorage')) return u;
      try {
          // If already valid, return
          if (u.includes('alt=media')) return u;
          
          // Append alt=media safely
          const separator = u.includes('?') ? '&' : '?';
          return `${u}${separator}alt=media`;
      } catch (e) {
          return u;
      }
  };

  // --- STRATEGY 1: SDK Fetch (Preferred for Admins) ---
  const fetchSDKConfig = async () => {
    if (!storage) return null;
    try { await ensureAuth(); } catch (e) { /* Auth optional for read */ }

    try {
       const pointerRef = ref(storage, 'config/current.json');
       const pointerUrl = await getDownloadURL(pointerRef);
       // Aggressive cache busting
       const pointerRes = await fetch(`${pointerUrl}&t=${Math.random()}`, { cache: 'no-store' });
       if (!pointerRes.ok) throw new Error("Pointer fetch failed");
       
       const pointerData = await pointerRes.json();
       
       if (pointerData.version) {
          console.log("[SiteContext] Found version (SDK):", pointerData.version);
          const configRef = ref(storage, `config/${pointerData.version}`);
          const configUrl = await getDownloadURL(configRef);
          const configRes = await fetch(`${configUrl}&t=${Math.random()}`, { cache: 'no-store' });
          if (!configRes.ok) throw new Error("Config fetch failed");
          return await configRes.json();
       }
    } catch (e) { /* Ignore */ }
    return null;
  };

  // --- STRATEGY 2: Raw HTTP Fetch (Fallback for Chrome/Edge) ---
  const fetchRawConfig = async () => {
    if (!bucketName) return null;
    try {
        console.log("[SiteContext] Attempting Raw HTTP Fetch...");
        const timestamp = Date.now();
        // 1. Fetch Pointer
        const pointerUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/config%2Fcurrent.json?alt=media&t=${timestamp}`;
        const pointerRes = await fetch(pointerUrl, { cache: 'no-store' });
        if (!pointerRes.ok) throw new Error("Raw pointer fetch failed");
        
        const pointerData = await pointerRes.json();
        
        if (pointerData.version) {
             console.log("[SiteContext] Found version (Raw):", pointerData.version);
             // 2. Fetch Config
             // Must encodeURIComponent twice for safe path handling in raw URLs if needed, but standard is single
             const configUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/config%2F${pointerData.version}?alt=media&t=${timestamp}`;
             const configRes = await fetch(configUrl, { cache: 'no-store' });
             if (!configRes.ok) throw new Error("Raw config fetch failed");
             return await configRes.json();
        }
    } catch (e) { /* Ignore */ }
    return null;
  };

  // --- STRATEGY 3: Legacy File (Last Resort) ---
  const fetchLegacyConfig = async () => {
      if (!bucketName) return null;
      try {
          const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/config%2Fsite_config.json?alt=media&t=${Date.now()}`;
          const res = await fetch(url, { cache: 'no-store' });
          if (res.ok) return await res.json();
      } catch (e) {}
      return null;
  };

  // --- Initialize site ---
  const initSite = useCallback(async () => {
    setIsStorageConfigured(!!storage);

    // 1. Load Local Draft First (Fastest)
    const localStr = localStorage.getItem('tara_site_config');
    let localConfig: SiteContent | null = null;
    if (localStr) {
      try { 
          localConfig = JSON.parse(localStr);
          if (localConfig) {
             // Heal URLs in local config immediately
             Object.keys(localConfig.images).forEach(k => {
                 localConfig!.images[k] = fixUrl(localConfig!.images[k]);
             });
             setContent(prev => ({ ...prev, ...localConfig }));
             console.log("[SiteContext] Loaded Local Draft");
          }
      } catch (e) {}
    }

    if (storage) {
        // 2. Attempt Cloud Fetch (Chain)
        let cloudConfig = await fetchSDKConfig();
        if (!cloudConfig) cloudConfig = await fetchRawConfig();
        if (!cloudConfig) cloudConfig = await fetchLegacyConfig();

        if (cloudConfig) {
           const cloudTime = cloudConfig.updatedAt || 0;
           const localTime = localConfig?.updatedAt || 0;
           
           // Heal URLs in cloud config
           if (cloudConfig.images) {
               Object.keys(cloudConfig.images).forEach(k => {
                   cloudConfig.images[k] = fixUrl(cloudConfig.images[k]);
               });
           }
           
           // SYNC LOGIC
           // If Local is newer than Cloud (User is Admin working on draft)
           if (localTime > cloudTime) {
               const lastPublished = parseInt(localStorage.getItem('tara_last_published') || '0');
               
               // If local matches what we *thought* we published, assume we are synced
               if (Math.abs(localTime - lastPublished) < 5000) {
                   console.log("[SiteContext] Local matches last publish. Synced.");
                   setHasUnsavedChanges(false);
               } else {
                   console.log("[SiteContext] Local draft is newer. Keeping draft.");
                   setHasUnsavedChanges(true);
               }
           } 
           // If Cloud is newer (Visitor, or Admin on fresh browser)
           else {
               console.log("[SiteContext] Cloud is newer. Updating.");
               const merged = { ...initialContent, ...cloudConfig };
               
               // Safely merge images (don't let empty cloud images overwrite valid local images if timestamps match)
               // Actually, for visitors, we MUST overwrite with cloud.
               setContent(merged);
               
               // Update local storage so we are in sync
               localStorage.setItem('tara_site_config', JSON.stringify(merged));
               setHasUnsavedChanges(false);
               localStorage.setItem('tara_last_published', cloudTime.toString());
           }
        } else {
           console.log("[SiteContext] Failed to load cloud config.");
           // If we have a local config, keep it. If not, we are at defaults.
           if (localConfig) setHasUnsavedChanges(true);
        }
    }

    // Load Gallery (Background)
    setTimeout(async () => {
      try {
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
    try { await ensureAuth(); } catch(e) {}
    
    const { gallery, ...saveData } = newContent;
    const timestamp = saveData.updatedAt; 
    
    // 1. Versioned Config
    const versionFilename = `site_config_v_${timestamp}.json`;
    const versionRef = ref(storage, `config/${versionFilename}`);
    
    await uploadString(versionRef, JSON.stringify(saveData), 'raw', {
      contentType: 'application/json',
      cacheControl: 'public, max-age=31536000',
      customMetadata: { version: String(timestamp) }
    });

    // 2. Pointer (With very strict no-cache)
    const pointerRef = ref(storage, 'config/current.json');
    await uploadString(pointerRef, JSON.stringify({ version: versionFilename, updatedAt: timestamp }), 'raw', {
      contentType: 'application/json',
      cacheControl: 'no-cache, no-store, max-age=0'
    });

    // 3. Legacy Backup
    const legacyRef = ref(storage, 'config/site_config.json');
    await uploadString(legacyRef, JSON.stringify(saveData), 'raw', {
      contentType: 'application/json',
      cacheControl: 'no-cache'
    });
    
    setSyncError(null);
  }, []);

  const publishSite = async () => {
     if (!isStorageConfigured) {
        alert("Cannot publish: Storage not configured.");
        return;
     }
     
     // 1. Force refresh content from State to avoid stale closure
     // In a real app we'd use a ref, but here we trust 'content' is updated via renders.
     
     const timestamp = Date.now();
     const contentToPublish = {
       ...content,
       updatedAt: timestamp
     };
     
     // 2. Update Local First
     localStorage.setItem('tara_last_published', timestamp.toString());
     localStorage.setItem('tara_site_config', JSON.stringify(contentToPublish));
     setContent(contentToPublish);
     setHasUnsavedChanges(false);

     // 3. Upload
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
    // URL CLEANING: Remove timestamp but KEEP tokens
    let cleanUrl = url;
    try {
        if (url.includes('firebasestorage')) {
            const urlObj = new URL(url);
            // Remove cache busters
            urlObj.searchParams.delete('t'); 
            urlObj.searchParams.delete('nocache');
            
            // Ensure alt=media exists
            if (!urlObj.searchParams.has('alt')) {
                urlObj.searchParams.set('alt', 'media');
            }
            cleanUrl = urlObj.toString();
        } 
    } catch (e) { }

    updateStateAndDraft(prev => ({
      ...prev,
      images: { ...prev.images, [key]: cleanUrl },
      updatedAt: Date.now()
    }));
  };

  const forceSync = async () => { await publishSite(); };

  const uploadToGallery = async (file: File) => {
    if (!storage) throw new Error("Storage not configured");
    try { await ensureAuth(); } catch(e) {}
    
    // Sanitize filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const path = `gallery/${Date.now()}_${sanitizedName}`;
    const storageRef = ref(storage, path);
    
    // Explicit MIME type detection
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'png') mimeType = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
        else if (ext === 'svg') mimeType = 'image/svg+xml';
        else if (ext === 'webp') mimeType = 'image/webp';
    }

    const metadata = { 
        contentType: mimeType || 'image/jpeg', 
        cacheControl: 'public, max-age=31536000' 
    };
    
    const snap = await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(snap.ref);
    
    // Display URL needs timestamp for immediate feedback in Gallery
    const displayUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
    setContent(prev => ({ ...prev, gallery: [displayUrl, ...prev.gallery] }));
  };

  const removeFromGallery = async (url: string) => {
     if (!storage) return;
     try {
       await ensureAuth();
       // Try to parse storage path from URL
       let path = url;
       try {
           const urlObj = new URL(url);
           if (url.includes('/o/')) {
               const p = urlObj.pathname.split('/o/')[1];
               if (p) path = decodeURIComponent(p);
           }
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
       // Log to analytics folder
       const logRef = ref(storage, `analytics/logs/${Date.now()}.json`);
       const sid = sessionStorage.getItem('t_sid') || Math.random().toString(36).substring(2);
       sessionStorage.setItem('t_sid', sid);
       const data = { path, timestamp: Date.now(), sid, ua: navigator.userAgent };
       // Fire and forget
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
