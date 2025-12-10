
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

  // HELPER: Direct HTTP Fetch (Bypasses SDK if Auth fails)
  const fetchDirect = async (path: string) => {
     if (!bucketName) throw new Error("No bucket");
     // Firebase Storage JSON API format
     const encodedPath = encodeURIComponent(path);
     const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&t=${Date.now()}`;
     const res = await fetch(url, { cache: 'no-store' });
     if (!res.ok) throw new Error("Direct fetch failed");
     return await res.json();
  };

  const initSite = useCallback(async () => {
    // Check configuration. Note: We allow proceeding even if 'storage' is null 
    // as long as we have a 'bucketName' to try direct fetching.
    if (!storage && !bucketName) {
      console.warn("⚠️ Firebase Storage is NOT initialized. Check API keys.");
      setIsInitialized(true);
      return;
    }
    
    if (storage) setIsStorageConfigured(true);

    try {
      // 1. Try to Authenticate (Might fail in Chrome/Edge due to cookies, but we continue)
      if (storage) {
          await ensureAuth().catch(err => console.warn("Anon Auth failed, proceeding to public fetch...", err));
      }
      
      let cloudConfig = null;

      // STRATEGY 1: SDK ListAll (Best for Versioning, requires functioning SDK)
      if (storage) {
        try {
            const configFolderRef = ref(storage, 'config/');
            const res = await listAll(configFolderRef);
            const versionFiles = res.items
                .filter(item => item.name.startsWith('site_config_v_') && item.name.endsWith('.json'))
                .sort((a, b) => a.name.localeCompare(b.name));
                
            if (versionFiles.length > 0) {
                const latest = versionFiles[versionFiles.length - 1];
                const url = await getDownloadURL(latest);
                console.log("🔥 Init: Found config via SDK List:", latest.name);
                const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}nocache=${Date.now()}`);
                if (response.ok) cloudConfig = await response.json();
            }
        } catch (e) {
            console.warn("SDK ListAll failed (Permission/Auth/Block), trying Direct Fallback...", e);
        }
      }

      // STRATEGY 2: Direct HTTP Fetch of 'current.json' (Fallback for 'Empty Spaces' issue)
      // This runs if Strategy 1 failed OR if SDK wasn't available at all.
      if (!cloudConfig && bucketName) {
          try {
            console.log("⚡ Init: Attempting Direct HTTP Fetch for current.json...");
            const pointerData = await fetchDirect('config/current.json');
            if (pointerData && pointerData.version) {
                 console.log("⚡ Init: Pointer found:", pointerData.version);
                 // Fetch the versioned file directly
                 cloudConfig = await fetchDirect(`config/${pointerData.version}`);
            }
          } catch(e) {
            console.warn("Direct Pointer Fetch failed", e);
          }
      }

      // STRATEGY 3: Direct HTTP Fetch of 'site_config.json' (Legacy Backup)
      if (!cloudConfig && bucketName) {
          try {
            console.log("⚡ Init: Attempting Direct HTTP Fetch for legacy config...");
            cloudConfig = await fetchDirect('config/site_config.json');
          } catch(e) {}
      }
      
      // APPLY CONFIG
      if (cloudConfig) {
        const localStr = localStorage.getItem('tara_site_config');
        let localConfig = null;
        if (localStr) {
           try { localConfig = JSON.parse(localStr); } catch(e) {}
        }

        // DECISION LOGIC:
        const isLocalNewer = localConfig && (localConfig.updatedAt > (cloudConfig.updatedAt || 0));
        
        if (isLocalNewer) {
           console.log("📝 SITE CONTEXT: Local draft is newer. Resuming draft.");
           setContent(prev => ({ ...prev, ...localConfig, gallery: prev.gallery }));
           setHasUnsavedChanges(true);
        } else {
           console.log("☁️ SITE CONTEXT: Synced to Cloud Config.");
           const updated = {
             ...initialContent,
             ...cloudConfig,
             images: { ...initialContent.images, ...cloudConfig.images },
             updatedAt: cloudConfig.updatedAt || Date.now(),
             gallery: content.gallery 
           };
           setContent(updated);
           localStorage.setItem('tara_site_config', JSON.stringify(updated));
           setHasUnsavedChanges(false);
        }
      } else {
        console.error("❌ Init: All strategies failed. App remains in default state.");
      }

    } catch (err) {
      console.warn("☁️ SITE CONTEXT: Fatal init error.", err);
      // Fallback to local if cloud fails completely
      const local = localStorage.getItem('tara_site_config');
      if (local) {
        try { setContent(prev => ({ ...prev, ...JSON.parse(local) })); } catch (e) {}
      }
    }

    // Load Gallery (Separately, non-blocking)
    try {
      if (storage) {
        const galleryListRef = ref(storage, 'gallery/');
        const res = await listAll(galleryListRef);
        const sortedItems = res.items.sort((a, b) => b.name.localeCompare(a.name)); 
        const urls = await Promise.all(sortedItems.map(r => getDownloadURL(r)));
        const bustedUrls = urls.map(u => `${u}${u.includes('?') ? '&' : '?'}t=${Date.now()}`);
        setContent(prev => ({ ...prev, gallery: bustedUrls }));
      }
    } catch (e) {
      // Gallery might fail on strict permissions, which is fine for visitors
    }

    setIsInitialized(true);
  }, [isAuthenticated]);

  useEffect(() => {
    initSite();
  }, [initSite]);

  const saveToCloud = useCallback(async (newContent: SiteContent) => {
    if (!storage) {
      const msg = "Cloud Sync Failed: Storage is not configured.";
      setSyncError(msg);
      throw new Error(msg);
    }
    try {
      await ensureAuth();
      const { gallery, ...saveData } = newContent;
      const timestamp = Date.now();
      
      // VERSIONING SYSTEM
      const versionFilename = `site_config_v_${timestamp}.json`;
      const versionRef = ref(storage, `config/${versionFilename}`);
      
      await uploadString(versionRef, JSON.stringify(saveData), 'raw', {
        contentType: 'application/json',
        cacheControl: 'public, max-age=31536000',
        customMetadata: { type: 'config', version: String(timestamp) }
      });

      const pointerRef = ref(storage, 'config/current.json');
      await uploadString(pointerRef, JSON.stringify({ version: versionFilename, updatedAt: timestamp }), 'raw', {
        contentType: 'application/json',
        cacheControl: 'no-cache, no-store, max-age=0',
        customMetadata: { type: 'pointer', updated: new Date().toISOString() }
      });

      // Legacy Backup
      const legacyRef = ref(storage, 'config/site_config.json');
      await uploadString(legacyRef, JSON.stringify(saveData), 'raw', {
        contentType: 'application/json',
        cacheControl: 'no-cache',
        customMetadata: { type: 'legacy_config' }
      });
      
      console.log("☁️ SITE CONTEXT: Publish success (Versioned).");
      setSyncError(null);
    } catch (e: any) {
      console.error("☁️ SITE CONTEXT: Publish failed.", e);
      setSyncError(e.message || "Unknown Cloud Sync Error");
      throw e; 
    }
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
    // IMPORTANT: Strip any existing query parameters (like previous timestamps)
    // This ensures we store the "Clean" URL. The frontend will append the global
    // site update timestamp dynamically.
    const cleanUrl = url.split('?')[0];

    updateStateAndDraft(prev => ({
      ...prev,
      images: { ...prev.images, [key]: cleanUrl },
      updatedAt: Date.now()
    }));
  };

  const forceSync = async () => {
     await publishSite();
  };

  const uploadToGallery = async (file: File) => {
    if (!storage) throw new Error("Storage not configured");
    try {
      await ensureAuth();
      const path = `gallery/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      
      let mimeType = file.type;
      if (!mimeType) {
         const ext = file.name.split('.').pop()?.toLowerCase();
         if (ext === 'png') mimeType = 'image/png';
         else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
         else if (ext === 'webp') mimeType = 'image/webp';
         else if (ext === 'svg') mimeType = 'image/svg+xml';
         else mimeType = 'application/octet-stream';
      }

      const metadata = {
        contentType: mimeType,
        cacheControl: 'public, max-age=31536000',
        customMetadata: { 
           originalName: file.name,
           uploadedAt: new Date().toISOString()
        }
      };
      
      const snap = await uploadBytes(storageRef, file, metadata);
      let url = await getDownloadURL(snap.ref);
      
      // We append the timestamp here so the GALLERY list sees a fresh image immediately.
      // However, `updateImage` will strip this before saving to the config to prevent lock-in.
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}t=${Date.now()}`;

      setContent(prev => ({ ...prev, gallery: [url, ...prev.gallery] }));
    } catch (e) { throw e; }
  };

  const removeFromGallery = async (url: string) => {
     if (!storage) return;
     try {
       await ensureAuth();
       // Strip params for deletion logic if needed
       const cleanUrl = url.split('?')[0];
       if (cleanUrl.includes('firebasestorage.googleapis.com')) {
          const r = ref(storage, cleanUrl);
          await deleteObject(r);
       }
       setContent(prev => ({ ...prev, gallery: prev.gallery.filter(i => i !== url) }));
     } catch (e) {
       // Optimistically remove even if remote delete fails
       setContent(prev => ({ ...prev, gallery: prev.gallery.filter(i => i !== url) }));
     }
  };

  const login = (input: string) => {
    if (input === adminPassword) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => setIsAuthenticated(false);

  const changePassword = (pw: string) => {
    localStorage.setItem('tara_admin_pw', pw);
  };

  const logVisit = async (path: string) => {
    if (!storage || path.startsWith('/admin')) return;
    try {
      await ensureAuth();
      const sid = sessionStorage.getItem('t_sid') || Math.random().toString(36).substring(2);
      sessionStorage.setItem('t_sid', sid);
      const data = { path, timestamp: Date.now(), sid, ua: navigator.userAgent };
      const logRef = ref(storage, `analytics/logs/${Date.now()}.json`);
      uploadString(logRef, JSON.stringify(data), 'raw', { contentType: 'application/json' }).catch(() => {});
    } catch (e) {}
  };

  return (
    <SiteContext.Provider value={{ 
      content, 
      updateHomeContent, 
      addCustomSection, 
      removeCustomSection, 
      updateImage, 
      uploadToGallery, 
      removeFromGallery, 
      logVisit, 
      isAuthenticated, 
      isStorageConfigured,
      syncError, 
      login, 
      logout, 
      changePassword, 
      isInitialized,
      hasUnsavedChanges, 
      publishSite,
      forceSync
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
