
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
    // 1. Basic configuration check
    if (!storage) {
      console.warn("⚠️ Firebase Storage is NOT initialized. Check API keys.");
      setIsInitialized(true);
      return;
    }
    setIsStorageConfigured(true);

    try {
      // NON-BLOCKING AUTH: We do NOT await this.
      // We start the auth process in background but immediately try to fetch public config.
      // This prevents the site from hanging if Auth is blocked or slow.
      ensureAuth().catch(e => console.warn("Background Auth check failed (harmless for visitors):", e));
      
      let cloudConfig = null;

      // 2. FETCH POINTER: Try to get the pointer URL via SDK or Direct Fallback
      let pointerUrl = '';
      try {
         // Try SDK first (handles tokens)
         const pointerRef = ref(storage, 'config/current.json');
         pointerUrl = await getDownloadURL(pointerRef);
      } catch (e) {
         // Fallback: Construct Direct URL manually if SDK fails (e.g. Script Blocked)
         // This assumes public read access is enabled in rules.
         if (bucketName) {
            pointerUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/config%2Fcurrent.json?alt=media`;
         }
      }

      if (pointerUrl) {
         try {
            // Aggressive Cache Busting
            const cacheBustedUrl = `${pointerUrl}${pointerUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
            const pointerRes = await fetch(cacheBustedUrl, { cache: 'no-store' });
            
            if (pointerRes.ok) {
                const pointerData = await pointerRes.json();
                if (pointerData.version) {
                    console.log("🔥 Init: Found pointer version:", pointerData.version);
                    
                    // Fetch the actual versioned config file
                    // We can use the same Direct URL strategy for the config file
                    let versionUrl = '';
                    try {
                        const versionRef = ref(storage, `config/${pointerData.version}`);
                        versionUrl = await getDownloadURL(versionRef);
                    } catch (e) {
                        if (bucketName) {
                            const encodedName = encodeURIComponent(`config/${pointerData.version}`);
                            versionUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedName}?alt=media`;
                        }
                    }

                    if (versionUrl) {
                        const configRes = await fetch(versionUrl);
                        if (configRes.ok) {
                            cloudConfig = await configRes.json();
                        }
                    }
                }
            }
         } catch (e) {
             console.warn("Pointer fetch failed", e);
         }
      }

      // 3. Fallback: Legacy site_config.json if pointer failed
      if (!cloudConfig) {
         try {
            const legacyRef = ref(storage, 'config/site_config.json');
            const legacyUrl = await getDownloadURL(legacyRef);
            const res = await fetch(`${legacyUrl}${legacyUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
            if (res.ok) cloudConfig = await res.json();
         } catch(e) { /* Ignore */ }
      }
      
      // 4. Apply Configuration
      if (cloudConfig) {
        const localStr = localStorage.getItem('tara_site_config');
        let localConfig = null;
        if (localStr) {
           try { localConfig = JSON.parse(localStr); } catch(e) {}
        }

        // Only use local draft if we are the Admin AND it's newer
        // For visitors, we ALWAYS enforce cloud config to avoid stale state
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

    // 5. Load Gallery (Admin Only / Background)
    // We wrap this separately so it doesn't block the main content
    try {
      if (isAuthenticated) {
          const galleryListRef = ref(storage, 'gallery/');
          const res = await listAll(galleryListRef);
          // Sort by name desc (assuming timestamp prefix)
          const sortedItems = res.items.sort((a, b) => b.name.localeCompare(a.name)); 
          
          const urls = await Promise.all(sortedItems.map(async (r) => {
             const u = await getDownloadURL(r);
             return `${u}${u.includes('?') ? '&' : '?'}t=${Date.now()}`;
          }));
          
          setContent(prev => ({ ...prev, gallery: urls }));
      }
    } catch (e) {
       // Silent fail for gallery
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
    // Robust URL Cleaning: Remove ONLY the 't' and 'nocache' params we added.
    // We do NOT use URLSearchParams because it can sometimes re-encode chars and break tokens.
    let cleanUrl = url;

    try {
        // Regex to safely remove &t=... or ?t=... without touching other params
        // Replaces ?t=123 with ? (or empty if it was the only param)
        // Replaces &t=123 with nothing
        cleanUrl = cleanUrl
            .replace(/([?&])t=\d+/, '$1')
            .replace(/([?&])nocache=\d+/, '$1');
        
        // Clean up any double ampersands or trailing separators caused by the replacement
        cleanUrl = cleanUrl
            .replace(/&&/g, '&')
            .replace(/[?&]$/, ''); // Remove trailing ? or &
            
        // If we removed the first param (e.g. ?t=...), ensure subsequent params start with ? not &
        if (cleanUrl.includes('firebasestorage') && cleanUrl.indexOf('?') === -1 && cleanUrl.indexOf('&') !== -1) {
            cleanUrl = cleanUrl.replace('&', '?');
        }
    } catch (e) {
        console.warn("URL cleaning failed, using raw", e);
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
       // Try ref from URL directly
       const r = ref(storage, url);
       await deleteObject(r);
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
       // Fire and forget logging
       // We do NOT await ensureAuth here to prevent blocking nav
       const logRef = ref(storage, `analytics/logs/${Date.now()}.json`);
       const sid = sessionStorage.getItem('t_sid') || Math.random().toString(36).substring(2);
       sessionStorage.setItem('t_sid', sid);
       const data = { path, timestamp: Date.now(), sid, ua: navigator.userAgent };
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
