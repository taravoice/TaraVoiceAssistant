
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, ensureAuth, bucketName } from '../firebase';
import { ref, getDownloadURL, listAll, deleteObject, uploadBytes, updateMetadata } from 'firebase/storage';

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
  const fixUrl = (u: string) => {
      if (!u || typeof u !== 'string' || !u.includes('firebasestorage')) return u;
      try {
          // If it's a direct storage link, ensure alt=media
          if (!u.includes('alt=media')) {
              const separator = u.includes('?') ? '&' : '?';
              return `${u}${separator}alt=media`;
          }
          return u;
      } catch (e) {
          return u;
      }
  };

  // --- ROBUST FETCH STRATEGY ---
  const fetchLatestConfig = async () => {
      // Strategy A: LIST ALL FILES (The "Truth" Strategy)
      // This bypasses the cached 'current.json' entirely by asking the bucket for the list of files.
      // This works best on Admin browsers or permissive browsers (Firefox/Safari).
      if (storage) {
          try {
             // We attempt to list without blocking on auth to be faster
             const configListRef = ref(storage, 'config/');
             const res = await listAll(configListRef);
             
             // Filter for versioned files: site_config_v_TIMESTAMP.json
             const versionFiles = res.items.filter(item => item.name.startsWith('site_config_v_'));
             
             if (versionFiles.length > 0) {
                 // Sort descending by timestamp in filename
                 versionFiles.sort((a, b) => {
                     const timeA = parseInt(a.name.split('_v_')[1] || '0');
                     const timeB = parseInt(b.name.split('_v_')[1] || '0');
                     return timeB - timeA;
                 });
                 
                 // Get newest
                 console.log("[SiteContext] Found latest version via List:", versionFiles[0].name);
                 const url = await getDownloadURL(versionFiles[0]);
                 const response = await fetch(url);
                 if (response.ok) return await response.json();
             }
          } catch (e) {
             console.warn("[SiteContext] ListAll Fetch failed (Privacy Block or Permissions)", e);
          }
      }

      // Strategy B: LEGACY HTTP FETCH (The "Brute Force" Strategy)
      // This helps Strict Browsers (Edge/Chrome) that block the SDK/IndexedDB.
      // We manually construct the URL to the 'site_config.json' fallback file.
      // We append a random timestamp to FORCE bypass the CDN cache (solving the Yandex issue).
      if (bucketName) {
          try {
              console.log("[SiteContext] Trying Direct HTTP fetch...");
              const timestamp = Date.now();
              const random = Math.random().toString(36).substring(7);
              // NOTE: This URL pattern is standard for public Firebase buckets
              const legacyUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/config%2Fsite_config.json?alt=media&t=${timestamp}_${random}`;
              
              const res = await fetch(legacyUrl, { 
                  cache: 'no-store',
                  headers: { 'Cache-Control': 'no-cache' } 
              });
              
              if (res.ok) return await res.json();
          } catch (e) {
              console.warn("[SiteContext] HTTP Legacy fetch failed", e);
          }
      }

      return null;
  };

  // --- Initialize site ---
  const initSite = useCallback(async () => {
    setIsStorageConfigured(!!storage);

    // 1. Load Local Draft First (Instant UI)
    const localStr = localStorage.getItem('tara_site_config');
    let localConfig: SiteContent | null = null;
    if (localStr) {
      try { 
          localConfig = JSON.parse(localStr);
          if (localConfig && localConfig.images) {
             // Ensure images are valid immediately
             Object.keys(localConfig.images).forEach(k => {
                 localConfig!.images[k] = fixUrl(localConfig!.images[k]);
             });
             setContent(prev => ({ ...prev, ...localConfig }));
          }
      } catch (e) {}
    }

    // 2. Fetch Latest from Cloud
    const cloudConfig = await fetchLatestConfig();

    if (cloudConfig) {
       const cloudTime = cloudConfig.updatedAt || 0;
       const localTime = localConfig?.updatedAt || 0;
       
       // Fix URLs from cloud
       if (cloudConfig.images) {
           Object.keys(cloudConfig.images).forEach(k => {
               cloudConfig.images[k] = fixUrl(cloudConfig.images[k]);
           });
       }
       
       // SYNC LOGIC
       // If Local Draft is NEWER than cloud, keep local.
       if (localTime > cloudTime) {
           const lastPublished = parseInt(localStorage.getItem('tara_last_published') || '0');
           
           // Exception: If local matches the last known published time, we are synced.
           if (Math.abs(localTime - lastPublished) < 2000) {
               console.log("[SiteContext] Synced (Local matches last published).");
               setHasUnsavedChanges(false);
           } else {
               console.log("[SiteContext] Local Draft is newer. Keeping Draft.");
               setHasUnsavedChanges(true);
           }
       } 
       else {
           // Cloud is newer -> Update everything
           console.log("[SiteContext] Cloud is newer/equal. Overwriting local.");
           
           // Safe Merge: Don't overwrite existing local images with empty strings from cloud
           // (This handles the 'Split Brain' issue if cloud was saved with empty data)
           const mergedImages = { ...initialImages };
           if (localConfig?.images) Object.assign(mergedImages, localConfig.images);
           if (cloudConfig.images) {
              Object.keys(cloudConfig.images).forEach(key => {
                 if (cloudConfig.images[key] && cloudConfig.images[key] !== "") {
                     mergedImages[key] = cloudConfig.images[key];
                 }
              });
           }

           const merged = { 
               ...initialContent, 
               ...cloudConfig,
               images: mergedImages 
           };
           
           setContent(merged);
           localStorage.setItem('tara_site_config', JSON.stringify(merged));
           setHasUnsavedChanges(false);
           localStorage.setItem('tara_last_published', cloudTime.toString());
       }
    } else {
       console.log("[SiteContext] Failed to load cloud config. Staying with local or default.");
       if (localConfig) {
           // If we have a local config but cloud failed, treat as unsaved just in case
           setHasUnsavedChanges(true);
       }
    }

    // Load Gallery (Background)
    setTimeout(async () => {
      try {
        if (!storage) return;
        try { await ensureAuth(); } catch(e) {}
        const listRef = ref(storage, 'gallery/');
        const res = await listAll(listRef);
        // Load recent images
        const recentItems = res.items.slice(-50).reverse();
        
        const urls = await Promise.all(recentItems.map(async r => {
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
    
    // Use Blobs for reliable metadata assignment
    const jsonString = JSON.stringify(saveData);
    const contentBlob = new Blob([jsonString], { type: 'application/json' });
    
    // Metadata options ensuring cache-control is set
    // 'no-store' is critical for the pointer file and legacy file
    const strictMetadata = {
        contentType: 'application/json',
        cacheControl: 'no-cache, no-store, max-age=0'
    };
    
    // 1. Versioned Config (Archival)
    // We can allow caching on this because the filename contains the timestamp (it is unique)
    const versionFilename = `site_config_v_${timestamp}.json`;
    const versionRef = ref(storage, `config/${versionFilename}`);
    
    await uploadBytes(versionRef, contentBlob, {
        contentType: 'application/json',
        cacheControl: 'public, max-age=31536000', // Cache forever
        customMetadata: { version: String(timestamp) }
    });

    // 2. Pointer File (Force Metadata to fix Caching)
    // This file MUST NOT be cached, or users see old versions.
    const pointerRef = ref(storage, 'config/current.json');
    const pointerData = JSON.stringify({ version: versionFilename, updatedAt: timestamp });
    const pointerBlob = new Blob([pointerData], { type: 'application/json' });
    
    // Upload with strict metadata
    await uploadBytes(pointerRef, pointerBlob, strictMetadata);

    // 3. Legacy Backup (Force Metadata)
    // This is used by the Direct HTTP fallback. It MUST NOT be cached.
    const legacyRef = ref(storage, 'config/site_config.json');
    await uploadBytes(legacyRef, contentBlob, strictMetadata);
    
    setSyncError(null);
    console.log("☁️ SITE CONTEXT: Saved successfully with strict metadata.");
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
     
     localStorage.setItem('tara_last_published', timestamp.toString());
     localStorage.setItem('tara_site_config', JSON.stringify(contentToPublish));
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
            // Ensure alt=media persists
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
    
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const path = `gallery/${Date.now()}_${sanitizedName}`;
    const storageRef = ref(storage, path);
    
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
