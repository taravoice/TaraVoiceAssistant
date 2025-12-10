
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, ensureAuth } from '../firebase';
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
  logo: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop',
  homeHeroBg: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop',
  homeIndustry1: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2053&auto=format&fit=crop',
  homeIndustry2: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1974&auto=format&fit=crop',
  feature1: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=2068&auto=format&fit=crop',
  feature2: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1000',
  feature3: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=2084&auto=format&fit=crop',
  feature4: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?q=80&w=2069&auto=format&fit=crop',
  feature5: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2015&auto=format&fit=crop',
  feature6: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?q=80&w=2006&auto=format&fit=crop',
  aboutTeam: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop',
  aboutFuture: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965&auto=format&fit=crop',
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
    if (!storage) {
      console.warn("⚠️ Firebase Storage is NOT initialized. Check API keys.");
      setIsInitialized(true);
      return;
    }
    setIsStorageConfigured(true);

    try {
      // Always attempt anonymous auth first
      await ensureAuth().catch(err => console.warn("Anon Auth failed, trying public access...", err));
      
      let downloadUrl = '';

      // STRATEGY 1: List all files in 'config/' and pick the latest one by name.
      // This BYPASSES CDN caching of 'current.json' because listAll hits the storage bucket API directly.
      try {
        const configFolderRef = ref(storage, 'config/');
        const res = await listAll(configFolderRef);
        
        // Filter for files matching our pattern: site_config_v_{timestamp}.json
        // Sort alphabetically (which works for timestamps of same length) to find the latest
        const versionFiles = res.items
            .filter(item => item.name.startsWith('site_config_v_') && item.name.endsWith('.json'))
            .sort((a, b) => a.name.localeCompare(b.name));
            
        if (versionFiles.length > 0) {
            const latest = versionFiles[versionFiles.length - 1];
            console.log("🔥 Version System: Found latest via direct list:", latest.name);
            downloadUrl = await getDownloadURL(latest);
        }
      } catch (e) {
        console.warn("Direct list failed, falling back to pointer file...", e);
      }

      // STRATEGY 2: Pointer File (Fallback)
      if (!downloadUrl) {
          try {
            const pointerRef = ref(storage, 'config/current.json');
            const pointerUrl = await getDownloadURL(pointerRef);
            const pointerRes = await fetch(`${pointerUrl}${pointerUrl.includes('?') ? '&' : '?'}t=${Date.now()}`, {
                cache: 'no-store'
            });
            if (pointerRes.ok) {
                const pointerData = await pointerRes.json();
                if (pointerData.version) {
                    const versionRef = ref(storage, `config/${pointerData.version}`);
                    downloadUrl = await getDownloadURL(versionRef);
                }
            }
          } catch(e) {}
      }

      // STRATEGY 3: Legacy Static File (Last Resort)
      if (!downloadUrl) {
          const configRef = ref(storage, 'config/site_config.json');
          downloadUrl = await getDownloadURL(configRef);
      }
      
      // Fetch the actual content
      if (downloadUrl) {
          const separator = downloadUrl.includes('?') ? '&' : '?';
          const response = await fetch(`${downloadUrl}${separator}nocache=${Date.now()}`);
          
          if (response.ok) {
            const cloudConfig = await response.json();
            const localStr = localStorage.getItem('tara_site_config');
            let localConfig = null;
            if (localStr) {
               try { localConfig = JSON.parse(localStr); } catch(e) {}
            }

            // DRAFT LOGIC: If local draft exists and is NEWER than cloud, keep local (for Admin).
            if (localConfig && (localConfig.updatedAt > (cloudConfig.updatedAt || 0))) {
               console.log("📝 SITE CONTEXT: Local draft is newer. Resuming draft.");
               setContent(prev => ({ ...prev, ...localConfig, gallery: prev.gallery }));
               setHasUnsavedChanges(true);
            } else {
               console.log("☁️ SITE CONTEXT: Synced to Cloud Config.");
               const updated = {
                 ...content, 
                 ...cloudConfig,
                 images: { ...content.images, ...cloudConfig.images },
                 updatedAt: cloudConfig.updatedAt || Date.now(),
                 gallery: content.gallery
               };
               setContent(updated);
               localStorage.setItem('tara_site_config', JSON.stringify(updated));
               setHasUnsavedChanges(false);
            }
          }
      }
    } catch (err) {
      console.warn("☁️ SITE CONTEXT: Could not load cloud config. Using local/default.", err);
      const local = localStorage.getItem('tara_site_config');
      if (local) {
        try { setContent(prev => ({ ...prev, ...JSON.parse(local) })); } catch (e) {}
      }
    }

    // Load Gallery separately (read-only list)
    try {
      const galleryListRef = ref(storage, 'gallery/');
      const res = await listAll(galleryListRef);
      // Sort gallery items by creation time if possible (not directly available in listAll without metadata fetch),
      // so we rely on client-side reversing of the array if names are timestamped.
      // However, names are timestamped in uploadToGallery.
      const sortedItems = res.items.sort((a, b) => b.name.localeCompare(a.name)); 
      
      const urls = await Promise.all(sortedItems.map(r => getDownloadURL(r)));
      setContent(prev => ({ ...prev, gallery: urls }));
    } catch (e) {
      // console.warn("Gallery load failed");
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
      
      // VERSIONING SYSTEM IMPLEMENTATION
      
      // 1. Define Unique Filename
      const versionFilename = `site_config_v_${timestamp}.json`;
      const versionRef = ref(storage, `config/${versionFilename}`);
      
      // 2. Upload the actual config file
      await uploadString(versionRef, JSON.stringify(saveData), 'raw', {
        contentType: 'application/json',
        cacheControl: 'public, max-age=31536000',
        customMetadata: { type: 'config', version: String(timestamp) }
      });

      // 3. Update the Pointer File (Still useful for simple checks, even if listing is preferred)
      const pointerRef = ref(storage, 'config/current.json');
      await uploadString(pointerRef, JSON.stringify({ version: versionFilename, updatedAt: timestamp }), 'raw', {
        contentType: 'application/json',
        cacheControl: 'no-cache, no-store, max-age=0',
        customMetadata: { type: 'pointer', updated: new Date().toISOString() }
      });

      // 4. Update Legacy File (Backup)
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

  // EXPLICIT PUBLISH ACTION
  const publishSite = async () => {
     if (!isStorageConfigured) {
        alert("Cannot publish: Storage not configured.");
        return;
     }

     // CRITICAL: Update timestamp to NOW
     const timestamp = Date.now();
     const contentToPublish = {
       ...content,
       updatedAt: timestamp
     };

     // Upload the fresh version
     await saveToCloud(contentToPublish);
     
     // Update local state to match
     setContent(contentToPublish);
     setHasUnsavedChanges(false);
     
     // Sync local storage
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
    updateStateAndDraft(prev => ({
      ...prev,
      images: { ...prev.images, [key]: url },
      updatedAt: Date.now()
    }));
  };

  const forceSync = async () => {
     await publishSite();
  };

  // Gallery operations
  const uploadToGallery = async (file: File) => {
    if (!storage) throw new Error("Storage not configured");
    try {
      await ensureAuth();
      const path = `gallery/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, path);
      
      // CRITICAL FIX: Robust Metadata Logic
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
        cacheControl: 'public, max-age=31536000', // 1 year cache
        customMetadata: { 
           originalName: file.name,
           uploadedAt: new Date().toISOString()
        }
      };
      
      const snap = await uploadBytes(storageRef, file, metadata);
      const url = await getDownloadURL(snap.ref);
      setContent(prev => ({ ...prev, gallery: [url, ...prev.gallery] }));
    } catch (e) { throw e; }
  };

  const removeFromGallery = async (url: string) => {
     if (!storage) return;
     try {
       await ensureAuth();
       if (url.includes('firebasestorage.googleapis.com')) {
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
