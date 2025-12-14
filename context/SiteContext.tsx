
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, ensureAuth } from '../firebase';
import { ref, getDownloadURL, uploadBytes, uploadString } from 'firebase/storage';
import { blogPosts as staticBlogPosts } from '../data/blogPosts';
import { CustomSection, BlogPost } from '../types';

export type { CustomSection, BlogPost };

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
  blogPosts: BlogPost[];
  updateHomeContent: (key: keyof SiteContent['home'], value: any) => Promise<void>;
  addCustomSection: (section: CustomSection) => Promise<void>;
  removeCustomSection: (id: string) => Promise<void>;
  updateImage: (key: string, url: string) => Promise<void>;
  uploadToGallery: (file: File) => Promise<void>;
  removeFromGallery: (url: string) => Promise<void>;
  logVisit: (path: string) => Promise<void>;
  subscribeToNewsletter: (email: string) => Promise<void>;
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

// Static Image Mapping for GitHub-based flow
const staticImageMap: SiteImages = {
  logo: '/logo.png',
  homeHeroBg: '/images/home_hero.png',
  homeIndustry1: '/images/industry_1.png',
  homeIndustry2: '/images/industry_2.png',
  feature1: '/images/feature_1.gif',
  feature2: '/images/feature_2.gif',
  feature3: '/images/feature_3.gif',
  feature4: '/images/feature_4.gif',
  feature5: '/images/feature_5.gif',
  feature6: '/images/feature_6.gif',
  aboutTeam: '/images/about_team.png',
  aboutFuture: '/images/about_future.png',
};

const initialContent: SiteContent = {
  home: {
    heroTitle: "AI Appointment Setter & 24/7 Phone Answering Service",
    heroSubtitle: "The ultimate AI receptionist for business. Automate inbound calls, appointment scheduling, and customer support with a human-like voice agent.",
    aboutTitle: "About Tara AI Voice Agent",
    aboutText: "Tara is the leading AI virtual receptionist service designed for SMBs to reduce inbound calls and automate booking.",
  },
  customSections: [],
  images: staticImageMap,
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

  const safeSetItem = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch (e) {}
  };

  const initSite = useCallback(async () => {
    setIsStorageConfigured(!!storage);

    // 1. Fetch Text Config (Local Draft Check)
    let localConfig: SiteContent | null = null;
    try {
      const localStr = localStorage.getItem('tara_site_config');
      if (localStr) localConfig = JSON.parse(localStr);
    } catch (e) {}

    if (storage) {
       ensureAuth().catch(() => {});

       // --- SITE CONTENT FETCH ---
       try {
           const pointerRef = ref(storage, 'config/current.json');
           const pointerUrl = await getDownloadURL(pointerRef);
           const pRes = await fetch(pointerUrl + `?t=${Date.now()}`, { cache: "no-store" });
           
           if (pRes.ok) {
              const pData = await pRes.json();
              if (pData.version) {
                 const vRef = ref(storage, `config/${pData.version}`);
                 const vUrl = await getDownloadURL(vRef);
                 const vRes = await fetch(vUrl);
                 
                 if (vRes.ok) {
                    const cloudConfig = await vRes.json();
                    const merged = { ...initialContent, ...cloudConfig, images: staticImageMap };
                    
                    const cloudTime = cloudConfig.updatedAt || 0;
                    const localTime = localConfig?.updatedAt || 0;
                    
                    if (localTime > cloudTime) {
                        setHasUnsavedChanges(true);
                        if (localConfig) setContent({ ...initialContent, ...localConfig, images: staticImageMap });
                    } else {
                        setContent(merged);
                        safeSetItem('tara_site_config', JSON.stringify(merged));
                        setHasUnsavedChanges(false);
                    }
                 }
              }
           }
       } catch (e) {
         console.warn("Site Config fetch failed:", e);
       }
    }
    
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    initSite();
  }, [initSite]);

  const saveToCloud = useCallback(async (newContent: SiteContent) => {
    if (!storage) throw new Error("Storage not configured.");

    const saveData = { ...newContent, images: staticImageMap };
    const timestamp = saveData.updatedAt || Date.now();
    const meta = { contentType: 'application/json', cacheControl: 'no-cache, no-store, max-age=0' };

    // 1. Save Site Config (Versioned)
    const contentBlob = new Blob([JSON.stringify(saveData)], { type: 'application/json' });
    const versionFilename = `site_config_v_${timestamp}.json`;
    await uploadBytes(ref(storage, `config/${versionFilename}`), contentBlob, meta);
    
    const pointerData = { version: versionFilename, updatedAt: timestamp };
    await uploadBytes(ref(storage, 'config/current.json'), new Blob([JSON.stringify(pointerData)], { type: 'application/json' }), meta);

    setSyncError(null);
  }, []);

  const publishSite = async () => {
     if (!isStorageConfigured) {
        alert("Cannot publish: Storage not configured.");
        return;
     }
     const timestamp = Date.now();
     const contentToPublish = { ...content, updatedAt: timestamp, images: staticImageMap };
     setContent(contentToPublish);
     setHasUnsavedChanges(false);
     safeSetItem('tara_site_config', JSON.stringify(contentToPublish));
     
     await saveToCloud(contentToPublish);
  };

  const updateStateAndDraft = (updater: (prev: SiteContent) => SiteContent) => {
     setContent(prev => {
        const next = updater(prev);
        safeSetItem('tara_site_config', JSON.stringify(next));
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

  // Newsletter Logic
  const subscribeToNewsletter = async (email: string) => {
    if (!storage) throw new Error("Storage not configured.");
    
    await ensureAuth();
    
    const timestamp = Date.now();
    // Sanitize email for filename to avoid issues, but keep it readable
    const safeEmail = email.replace(/[^a-zA-Z0-9@._-]/g, '_');
    
    const filename = `newsletter/${safeEmail}___${timestamp}.json`;
    
    const data = {
      email,
      date: new Date().toISOString(),
      timestamp
    };

    const fileRef = ref(storage, filename);
    await uploadString(fileRef, JSON.stringify(data), 'raw', {
      contentType: 'application/json'
    });
  };

  const updateImage = async () => {};
  const uploadToGallery = async () => {};
  const removeFromGallery = async () => {};
  const forceSync = async () => { await publishSite(); };
  
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
    if (path.startsWith('/admin')) return;
    
    // Basic session ID
    let sessionId = sessionStorage.getItem('tara_sid');
    if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        sessionStorage.setItem('tara_sid', sessionId);
    }

    const payload = {
        path,
        sessionId,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        language: navigator.language,
        screen: `${window.screen.width}x${window.screen.height}`
    };

    try {
        // Send to serverless endpoint to bypass CORS/Auth issues on client
        await fetch('/api/drain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        });
    } catch (e) {
        // Fail silently for analytics
    }
  };

  return (
    <SiteContext.Provider value={{ 
      content, 
      blogPosts: staticBlogPosts, 
      updateHomeContent, addCustomSection, removeCustomSection, 
      updateImage, uploadToGallery, removeFromGallery, logVisit, 
      subscribeToNewsletter,
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
