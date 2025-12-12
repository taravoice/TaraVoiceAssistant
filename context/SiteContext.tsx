
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, ensureAuth, bucketName } from '../firebase';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { blogPosts as staticBlogPosts } from '../data/blogPosts';
import { CustomSection, BlogPost } from '../types'; // Import types

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
  blogPosts: BlogPost[]; // Dynamic Blog Posts
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
  saveBlogPost: (post: BlogPost) => Promise<void>;
  deleteBlogPost: (id: string) => Promise<void>;
}

const staticImageMap: SiteImages = {
  logo: '/logo.png',
  homeHeroBg: '/images/home_hero.png',
  homeIndustry1: '/images/industry_1.png',
  homeIndustry2: '/images/industry_2.png',
  feature1: '/images/feature_1.png',
  feature2: '/images/feature_2.png',
  feature3: '/images/feature_3.png',
  feature4: '/images/feature_4.png',
  feature5: '/images/feature_5.png',
  feature6: '/images/feature_6.png',
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
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>(staticBlogPosts); // Init with static
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

    // 1.1 Fetch Blog Drafts
    try {
        const localBlog = localStorage.getItem('tara_blog_posts');
        if (localBlog) {
            const parsed = JSON.parse(localBlog);
            if (Array.isArray(parsed) && parsed.length > 0) {
                setBlogPosts(parsed);
                console.log("📝 BLOG CONTEXT: Loaded local drafts.");
            }
        }
    } catch(e) {}

    if (storage) {
       ensureAuth().catch(() => {});

       try {
           const pointerRef = ref(storage, 'config/current.json');
           const pointerUrl = await getDownloadURL(pointerRef);
           const pRes = await fetch(pointerUrl + `?t=${Date.now()}`);
           
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
                        if (localConfig) setContent({ ...localConfig, images: staticImageMap });
                    } else {
                        setContent(merged);
                        safeSetItem('tara_site_config', JSON.stringify(merged));
                        setHasUnsavedChanges(false);
                    }
                 }
              }
           }
       } catch (e) {}

       // 2. Fetch Blog Posts from Firebase (Robust Strategy)
       try {
         let fetchedPosts: BlogPost[] | null = null;

         // Strategy A: SDK
         try {
             const blogRef = ref(storage, 'config/blog_posts.json');
             const blogUrl = await getDownloadURL(blogRef);
             const blogRes = await fetch(blogUrl + `?t=${Date.now()}`);
             if (blogRes.ok) {
                 fetchedPosts = await blogRes.json();
             }
         } catch(e) { console.log("SDK Fetch for blog failed, trying fallback."); }

         // Strategy B: Direct HTTP Fallback (if SDK blocked)
         if (!fetchedPosts && bucketName) {
            try {
                // Manually construct URL to bypass SDK auth requirements if public
                const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/config%2Fblog_posts.json?alt=media&t=${Date.now()}`;
                const res = await fetch(url);
                if (res.ok) fetchedPosts = await res.json();
            } catch(e) {}
         }

         if (Array.isArray(fetchedPosts) && fetchedPosts.length > 0) {
             console.log("🔥 BLOG CONTEXT: Found dynamic posts:", fetchedPosts.length);
             setBlogPosts(fetchedPosts);
             safeSetItem('tara_blog_posts', JSON.stringify(fetchedPosts)); // Update local cache
         }
       } catch (e) {
         console.log("No dynamic blog posts found, using static default.");
       }
    }
    
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    initSite();
  }, [initSite]);

  const saveToCloud = useCallback(async (newContent: SiteContent, newBlogPosts?: BlogPost[]) => {
    if (!storage) throw new Error("Storage not configured.");

    const saveData = { ...newContent, images: staticImageMap };
    const timestamp = saveData.updatedAt;
    const meta = { contentType: 'application/json', cacheControl: 'no-cache, no-store, max-age=0' };

    const contentBlob = new Blob([JSON.stringify(saveData)], { type: 'application/json' });
    const versionFilename = `site_config_v_${timestamp}.json`;
    
    await uploadBytes(ref(storage, `config/${versionFilename}`), contentBlob, meta);
    
    const pointerData = { version: versionFilename, updatedAt: timestamp };
    await uploadBytes(ref(storage, 'config/current.json'), new Blob([JSON.stringify(pointerData)], { type: 'application/json' }), meta);

    // Save Blog Posts if provided
    if (newBlogPosts) {
      const blogBlob = new Blob([JSON.stringify(newBlogPosts)], { type: 'application/json' });
      await uploadBytes(ref(storage, 'config/blog_posts.json'), blogBlob, meta);
    }

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
     
     // Pass current blogPosts to saveToCloud to ensure they persist
     await saveToCloud(contentToPublish, blogPosts);
  };

  const saveBlogPost = async (post: BlogPost) => {
    const updatedPosts = [...blogPosts];
    const index = updatedPosts.findIndex(p => p.id === post.id);
    if (index >= 0) {
      updatedPosts[index] = post;
    } else {
      updatedPosts.unshift(post); // Add new to top
    }
    setBlogPosts(updatedPosts);
    safeSetItem('tara_blog_posts', JSON.stringify(updatedPosts)); // Persist draft immediately
    
    // Immediate auto-save to cloud for Blog
    await saveToCloud(content, updatedPosts); 
  };

  const deleteBlogPost = async (id: string) => {
    const updatedPosts = blogPosts.filter(p => p.id !== id);
    setBlogPosts(updatedPosts);
    safeSetItem('tara_blog_posts', JSON.stringify(updatedPosts));
    await saveToCloud(content, updatedPosts);
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
  const logVisit = async () => {};

  return (
    <SiteContext.Provider value={{ 
      content, blogPosts, updateHomeContent, addCustomSection, removeCustomSection, 
      updateImage, uploadToGallery, removeFromGallery, logVisit, 
      isAuthenticated, isStorageConfigured, syncError, 
      login, logout, changePassword, isInitialized, hasUnsavedChanges, 
      publishSite, forceSync, saveBlogPost, deleteBlogPost
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
