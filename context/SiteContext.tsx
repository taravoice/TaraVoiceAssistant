
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

  const initSite = useCallback(async () => {
    // Basic configuration check
    if (!storage) {
      console.warn("⚠️ Firebase Storage is NOT initialized. Check API keys.");
      setIsInitialized(true);
      return;
    }
    setIsStorageConfigured(true);

    try {
      // 1. Attempt Authentication (Silent)
      // This might fail on privacy-focused browsers, but we proceed anyway.
      await ensureAuth().catch(() => {});
      
      let cloudConfig = null;

      // 2. Fetch Logic
      // We prioritize finding the "Pointer File" (current.json) via SDK URL generation.
      // SDK URL generation is robust and handles token details for us.
      try {
        const pointerRef = ref(storage, 'config/current.json');
        
        // Get the signed/public URL from Firebase SDK
        const pointerUrl = await getDownloadURL(pointerRef);
        
        // Critical: Append timestamp to the REQUEST URL to bust browser/CDN cache
        const cacheBustedUrl = `${pointerUrl}${pointerUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
        
        const pointerRes = await fetch(cacheBustedUrl, { cache: 'no-store' });
        
        if (pointerRes.ok) {
            const pointerData = await pointerRes.json();
            if (pointerData.version) {
                console.log("🔥 Init: Found pointer version:", pointerData.version);
                
                // Now fetch the actual versioned config file
                const versionRef = ref(storage, `config/${pointerData.version}`);
                const versionUrl = await getDownloadURL(versionRef);
                const configRes = await fetch(versionUrl);
                
                if (configRes.ok) {
                    cloudConfig = await configRes.json();
                }
            }
        }
      } catch (e) {
         console.warn("Pointer fetch failed, trying legacy fallback...", e);
      }

      // 3. Fallback: Legacy site_config.json
      if (!cloudConfig) {
         try {
            const legacyRef = ref(storage, 'config/site_config.json');
            const legacyUrl = await getDownloadURL(legacyRef);
            const res = await fetch(`${legacyUrl}${legacyUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
            if (res.ok) cloudConfig = await res.json();
         } catch(e) {
            console.warn("Legacy fetch failed", e);
         }
      }
      
      // 4. Apply Configuration
      if (cloudConfig) {
        const localStr = localStorage.getItem('tara_site_config');
        let localConfig = null;
        if (localStr) {
           try { localConfig = JSON.parse(localStr); } catch(e) {}
        }

        // Only use local draft if we are the Admin (Authenticated) and it's newer
        const isLocalNewer = isAuthenticated && localConfig && (localConfig.updatedAt > (cloudConfig.updatedAt || 0));
        
        if (isLocalNewer) {
           console.log("📝 SITE CONTEXT: Local draft is newer. Resuming draft.");
           setContent(prev => ({ ...prev, ...localConfig, gallery: prev.gallery }));
           setHasUnsavedChanges(true);
        } else {
           console.log("☁️ SITE CONTEXT: Synced to Cloud Config.");
           const updated = {
             ...initialContent,
             ...cloudConfig,
             // Merge images carefully to avoid losing keys
             images: { ...initialContent.images, ...cloudConfig.images },
             updatedAt: cloudConfig.updatedAt || Date.now(),
             gallery: content.gallery 
           };
           setContent(updated);
           localStorage.setItem('tara_site_config', JSON.stringify(updated));
           setHasUnsavedChanges(false);
        }
      } else {
        console.error("❌ Init: Failed to load any configuration.");
      }

    } catch (err) {
      console.warn("☁️ SITE CONTEXT: Fatal init error.", err);
    }

    // 5. Load Gallery (Non-blocking)
    try {
      const galleryListRef = ref(storage, 'gallery/');
      const res = await listAll(galleryListRef);
      // Sort by name desc (assuming timestamp prefix)
      const sortedItems = res.items.sort((a, b) => b.name.localeCompare(a.name)); 
      
      const urls = await Promise.all(sortedItems.map(async (r) => {
         const u = await getDownloadURL(r);
         // Append cache buster to gallery images so admin sees fresh uploads
         return `${u}${u.includes('?') ? '&' : '?'}t=${Date.now()}`;
      }));
      
      setContent(prev => ({ ...prev, gallery: urls }));
    } catch (e) {
      // console.log("Gallery load skipped");
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
      
      // 1. Versioned Config File
      const versionFilename = `site_config_v_${timestamp}.json`;
      const versionRef = ref(storage, `config/${versionFilename}`);
      
      await uploadString(versionRef, JSON.stringify(saveData), 'raw', {
        contentType: 'application/json',
        cacheControl: 'public, max-age=31536000',
        customMetadata: { type: 'config', version: String(timestamp) }
      });

      // 2. Pointer File
      const pointerRef = ref(storage, 'config/current.json');
      await uploadString(pointerRef, JSON.stringify({ version: versionFilename, updatedAt: timestamp }), 'raw', {
        contentType: 'application/json',
        cacheControl: 'no-cache, no-store, max-age=0',
        customMetadata: { type: 'pointer', updated: new Date().toISOString() }
      });

      // 3. Legacy Backup
      const legacyRef = ref(storage, 'config/site_config.json');
      await uploadString(legacyRef, JSON.stringify(saveData), 'raw', {
        contentType: 'application/json',
        cacheControl: 'no-cache',
        customMetadata: { type: 'legacy_config' }
      });
      
      console.log("☁️ SITE CONTEXT: Publish success.");
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
    // Clean URL: Remove our custom cache busters (t=...) and nocache params
    // BUT preserve the 'alt' and 'token' params required by Firebase
    let cleanUrl = url;
    
    try {
       // Check if it's a valid URL first
       const urlObj = new URL(url);
       
       // Create a new search params object to avoid mutation issues
       const params = new URLSearchParams(urlObj.search);
       
       // Remove ONLY the cache-busting params we added
       params.delete('t');
       params.delete('nocache');
       
       // Reconstruct URL
       urlObj.search = params.toString();
       cleanUrl = urlObj.toString();
    } catch (e) {
       // Fallback for partial/invalid URLs: Just basic string replacement
       cleanUrl = url.replace(/[?&]t=\d+/, '').replace(/[?&]nocache=\d+/, '');
       // Fix dangling & or ? at end if removal caused it
       if (cleanUrl.endsWith('&') || cleanUrl.endsWith('?')) {
          cleanUrl = cleanUrl.slice(0, -1);
       }
    }

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
      const url = await getDownloadURL(snap.ref);
      
      // Append cache buster for immediate display in gallery
      const bustedUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;

      setContent(prev => ({ ...prev, gallery: [bustedUrl, ...prev.gallery] }));
    } catch (e) { throw e; }
  };

  const removeFromGallery = async (url: string) => {
     if (!storage) return;
     try {
       await ensureAuth();
       
       // Clean URL before deleting (remove tokens/query params)
       let pathRef = '';
       try {
         const urlObj = new URL(url);
         // Firebase storage path structure: .../o/FOLDER%2FFILE?alt...
         const pathStart = urlObj.pathname.indexOf('/o/');
         if (pathStart !== -1) {
            const encodedPath = urlObj.pathname.substring(pathStart + 3);
            pathRef = decodeURIComponent(encodedPath);
         }
       } catch (e) {
         // Fallback
       }

       if (pathRef) {
          const r = ref(storage, pathRef);
          await deleteObject(r);
       } else {
          // Try ref from URL directly if parsing failed
          const r = ref(storage, url);
          await deleteObject(r);
       }
       
       setContent(prev => ({ ...prev, gallery: prev.gallery.filter(i => i !== url) }));
     } catch (e) {
       console.error("Delete failed", e);
       // Remove from UI anyway
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
