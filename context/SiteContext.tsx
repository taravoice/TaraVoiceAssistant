
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

  // --- STRATEGY 1: SDK Fetch (Preferred) ---
  const fetchSDKConfig = async () => {
    if (!storage) return null;
    
    // Attempt Auth (Non-blocking)
    try { await ensureAuth(); } catch (e) { console.warn("[SiteContext] Auth blocked/failed. Attempting public read..."); }

    try {
       // 1. Get Pointer
       const pointerRef = ref(storage, 'config/current.json');
       const pointerUrl = await getDownloadURL(pointerRef);
       
       // 2. Fetch Pointer Content (Bypass Cache)
       const pointerRes = await fetch(`${pointerUrl}&t=${Date.now()}`, { cache: 'no-store' });
       if (!pointerRes.ok) throw new Error("Pointer fetch failed");
       
       const pointerData = await pointerRes.json();
       
       if (pointerData.version) {
          console.log("[SiteContext] Found version (SDK):", pointerData.version);
          // 3. Get Actual Config
          const configRef = ref(storage, `config/${pointerData.version}`);
          const configUrl = await getDownloadURL(configRef);
          const configRes = await fetch(`${configUrl}&t=${Date.now()}`, { cache: 'no-store' });
          if (!configRes.ok) throw new Error("Config fetch failed");
          
          return await configRes.json();
       }
    } catch (e: any) {
       console.warn("[SiteContext] SDK Version lookup failed:", e.message);
    }
    return null;
  };

  // --- STRATEGY 2: Raw HTTP Fetch (Fallback for Edge/Chrome/Strict) ---
  const fetchRawConfig = async () => {
    if (!bucketName) return null;
    try {
        console.log("[SiteContext] Attempting Raw HTTP Fetch...");
        // Construct direct URL to Firebase Storage REST API
        // This bypasses the JS SDK entirely
        const timestamp = Date.now();
        const pointerUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/config%2Fcurrent.json?alt=media&t=${timestamp}`;
        
        const pointerRes = await fetch(pointerUrl, { 
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
        });
        if (!pointerRes.ok) throw new Error("Raw pointer fetch failed");
        
        const pointerData = await pointerRes.json();
        
        if (pointerData.version) {
             console.log("[SiteContext] Found version (Raw):", pointerData.version);
             const configUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/config%2F${pointerData.version}?alt=media&t=${timestamp}`;
             const configRes = await fetch(configUrl, { cache: 'no-store' });
             if (!configRes.ok) throw new Error("Raw config fetch failed");
             return await configRes.json();
        }
    } catch (e) {
        console.warn("[SiteContext] Raw fetch failed:", e);
    }
    return null;
  };

  // --- STRATEGY 3: Legacy/Backup Fetch (If versioning fails completely) ---
  const fetchLegacyConfig = async () => {
      if (!bucketName) return null;
      try {
          console.log("[SiteContext] Attempting Legacy Backup Fetch...");
          const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/config%2Fsite_config.json?alt=media&t=${Date.now()}`;
          const res = await fetch(url, { cache: 'no-store' });
          if (!res.ok) return null;
          return await res.json();
      } catch (e) {
          return null;
      }
  };

  // --- Initialize site ---
  const initSite = useCallback(async () => {
    setIsStorageConfigured(!!storage);

    // STEP 1: LOCAL-FIRST LOAD (Optimistic)
    const localStr = localStorage.getItem('tara_site_config');
    let localConfig: SiteContent | null = null;
    if (localStr) {
      try { 
          localConfig = JSON.parse(localStr); 
          if (localConfig) {
             console.log("[SiteContext] Loaded Local Draft.");
             setContent(prev => ({ ...prev, ...localConfig }));
          }
      } catch (e) {}
    }

    // STEP 2: FETCH CLOUD CONFIG (Multi-Strategy)
    if (storage) {
        let cloudConfig = await fetchSDKConfig();
        
        // Fallback 1: Raw HTTP if SDK failed
        if (!cloudConfig) {
             cloudConfig = await fetchRawConfig();
        }

        // Fallback 2: Legacy file if Versioning failed
        if (!cloudConfig) {
             cloudConfig = await fetchLegacyConfig();
        }

        // STEP 3: RESOLVE CONFLICTS
        if (cloudConfig) {
           const cloudTime = cloudConfig.updatedAt || 0;
           const localTime = localConfig?.updatedAt || 0;
           
           // If Local is NEWER than Cloud, KEEP LOCAL (Draft Mode)
           if (localTime > cloudTime) {
               const lastPublished = parseInt(localStorage.getItem('tara_last_published') || '0');
               
               // Check if local matches what we *think* we last published
               // If yes, we are synced, just cloud is stale (CDN delay)
               // Increased window to 10s to handle minor drift
               if (Math.abs(localTime - lastPublished) < 10000) {
                   console.log("[SiteContext] Local matches last publish. Synced (Cloud Lag).");
                   setHasUnsavedChanges(false);
               } else {
                   console.log("[SiteContext] Local draft is newer. Keeping draft.");
                   setHasUnsavedChanges(true);
               }
           } 
           // If Cloud is NEWER (or Local doesn't exist), OVERWRITE LOCAL
           else if (cloudTime >= localTime) {
               console.log("[SiteContext] Cloud is newer. Updating local.");
               const merged = { ...initialContent, ...cloudConfig };
               setContent(merged);
               localStorage.setItem('tara_site_config', JSON.stringify(merged));
               setHasUnsavedChanges(false);
               // Also update the last published marker to avoid confusion
               localStorage.setItem('tara_last_published', cloudTime.toString());
           }
        } else {
            // Cloud fetch failed entirely
            console.log("[SiteContext] All cloud fetches failed. Using local/defaults.");
            // If we have a local config, stick with it. 
            // If not, we are stuck with empty defaults (Edge case: First visit + Offline/Blocked).
            if (localConfig) setHasUnsavedChanges(true);
        }
    }

    // STEP 4: LOAD GALLERY (Background)
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
    
    // 1. Versioned Config (Cache forever)
    const versionFilename = `site_config_v_${timestamp}.json`;
    const versionRef = ref(storage, `config/${versionFilename}`);
    
    await uploadString(versionRef, JSON.stringify(saveData), 'raw', {
      contentType: 'application/json',
      cacheControl: 'public, max-age=31536000',
      customMetadata: { version: String(timestamp) }
    });

    // 2. Pointer (No cache)
    const pointerRef = ref(storage, 'config/current.json');
    await uploadString(pointerRef, JSON.stringify({ version: versionFilename, updatedAt: timestamp }), 'raw', {
      contentType: 'application/json',
      cacheControl: 'no-cache, no-store, max-age=0'
    });

    // 3. Legacy Fallback (No cache) - Vital for fallback strategy
    const legacyRef = ref(storage, 'config/site_config.json');
    await uploadString(legacyRef, JSON.stringify(saveData), 'raw', {
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
     
     // Set marker BEFORE upload so we trust this version even if upload is slow
     localStorage.setItem('tara_last_published', timestamp.toString());
     localStorage.setItem('tara_site_config', JSON.stringify(contentToPublish));
     
     // Optimistically update state
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
    let cleanUrl = url;
    try {
        if (url.includes('firebasestorage')) {
            const urlObj = new URL(url);
            urlObj.searchParams.delete('t'); 
            urlObj.searchParams.delete('nocache');
            
            if (!urlObj.searchParams.has('alt')) {
                urlObj.searchParams.set('alt', 'media');
            }
            
            cleanUrl = urlObj.toString();
        } 
    } catch (e) { 
        console.warn("URL cleanup failed, using original", e);
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
    try { await ensureAuth(); } catch(e) {}
    
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
