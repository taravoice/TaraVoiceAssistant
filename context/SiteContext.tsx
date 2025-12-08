import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage, ensureAuth } from '../firebase';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject, uploadString } from 'firebase/storage';

export interface CustomSection {
  id: string;
  title: string;
  content: string;
  image?: string;
  page: string; // 'Home' | 'About' | 'Features' | 'Pricing' | 'Contact'
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
  gallery: string[]; // List of available image URLs
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
  login: (password: string) => boolean;
  logout: () => void;
  changePassword: (newPassword: string) => void;
}

const defaultImages: SiteImages = {
  logo: '/logo.png',
  // Home Page
  homeHeroBg: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop',
  homeIndustry1: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop',
  homeIndustry2: 'https://images.unsplash.com/photo-1600948836101-f9ffda59d250?q=80&w=800&auto=format&fit=crop',
  
  // Features Page
  feature1: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?q=80&w=2068&auto=format&fit=crop',
  feature2: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1740&auto=format&fit=crop',
  feature3: 'https://images.unsplash.com/photo-1534536281715-e28d76689b4d?q=80&w=2069&auto=format&fit=crop',
  feature4: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1974&auto=format&fit=crop',
  feature5: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1740&auto=format&fit=crop',
  feature6: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop',
};

// Default system images to always show in gallery
const systemGallery = [
  '/logo.png',
  ...Object.values(defaultImages).filter(url => url.startsWith('http'))
];

const defaultContent: SiteContent = {
  home: {
    heroTitle: "AI Appointment Setter for Your Business",
    heroSubtitle: "Automate your appointment scheduling and handle customer interactions 24/7 with human-like accuracy. Never miss a lead again.",
    aboutTitle: "About Tara Voice Assistant",
    aboutText: "Tara Voice Assistant is a cutting-edge AI-driven solution designed to empower small and medium-sized businesses with the tools they need to streamline customer interactions. It handles appointment scheduling, answers customer inquiries, and manages call-related tasks with human-like accuracy 24/7.",
  },
  customSections: [],
  images: defaultImages,
  gallery: systemGallery
};

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStorageConfigured, setIsStorageConfigured] = useState(false);
  
  // Admin Credentials State (Persisted in LocalStorage)
  const [adminPassword, setAdminPassword] = useState(() => {
    return localStorage.getItem('tara_admin_pw') || '987654321';
  });

  // 1. INITIALIZE & LOAD CONFIG
  useEffect(() => {
    const initSite = async () => {
      // Guard: If storage is null (keys missing), stop here to prevent crash
      if (!storage) {
        setIsStorageConfigured(false);
        return;
      }

      setIsStorageConfigured(true);

      // A. Load Gallery Images
      try {
        const listRef = ref(storage, 'gallery/');
        const res = await listAll(listRef);
        
        const urls = await Promise.all(
          res.items.map((itemRef: any) => getDownloadURL(itemRef))
        );

        setContent(prev => ({
          ...prev,
          gallery: [...systemGallery, ...urls]
        }));
      } catch (error) {
        console.warn("Gallery fetch warning:", error);
      }

      // B. Load Site Configuration (Logo, Text, etc.)
      try {
        const configRef = ref(storage, 'config/site_config.json');
        // Add timestamp to prevent browser caching of the JSON file
        const url = await getDownloadURL(configRef);
        const response = await fetch(`${url}?t=${Date.now()}`);
        
        if (response.ok) {
            const savedConfig = await response.json();
            console.log("✅ Loaded Saved Config:", savedConfig);
            setContent(prev => ({
                ...prev,
                ...savedConfig,
                // Ensure gallery is not overwritten by the config file (it comes from bucket list)
                gallery: prev.gallery 
            }));
        }
      } catch (error: any) {
        if (error.code !== 'storage/object-not-found') {
            console.warn("Config fetch warning:", error);
        }
      }
    };

    initSite();
  }, []);

  // 2. SAVE CONFIGURATION TO FIREBASE
  const saveSiteConfig = async (newContent: SiteContent) => {
    if (!storage) return;

    try {
       await ensureAuth();
       const configRef = ref(storage, 'config/site_config.json');
       
       // Create a clean copy to save (exclude the dynamic gallery list)
       const { gallery, ...configToSave } = newContent;
       
       await uploadString(configRef, JSON.stringify(configToSave), 'raw', {
           contentType: 'application/json'
       });
       console.log("✅ Configuration Saved Successfully to Firebase");
    } catch (error) {
       console.error("❌ Failed to save configuration:", error);
    }
  };

  const updateHomeContent = async (key: keyof SiteContent['home'], value: any) => {
    setContent(prev => {
      const next = {
        ...prev,
        home: { ...prev.home, [key]: value }
      };
      saveSiteConfig(next);
      return next;
    });
  };

  const addCustomSection = async (section: CustomSection) => {
    setContent(prev => {
      const next = {
        ...prev,
        customSections: [...prev.customSections, section]
      };
      saveSiteConfig(next);
      return next;
    });
  };

  const removeCustomSection = async (id: string) => {
    setContent(prev => {
      const next = {
        ...prev,
        customSections: prev.customSections.filter(s => s.id !== id)
      };
      saveSiteConfig(next);
      return next;
    });
  };

  const updateImage = async (key: string, url: string) => {
    console.log(`Updating Image: ${key} -> ${url}`);
    
    // 1. Immediate Local Update (So UI reflects change instantly)
    setContent(prev => {
        const newContent = {
            ...prev,
            images: { ...prev.images, [key]: url }
        };
        // 2. Background Save
        saveSiteConfig(newContent);
        return newContent;
    });
  };

  // Upload to Firebase Storage with Timeout prevention
  const uploadToGallery = async (file: File): Promise<void> => {
    if (!storage) {
      alert("Firebase connection missing. Check your API keys.");
      throw new Error("No storage connection");
    }

    // CRITICAL: Ensure we are authenticated (Anonymous) before upload
    try {
        await ensureAuth();
    } catch(e) {
        console.warn("Auth check failed before upload:", e);
    }

    // Create a timeout promise that rejects after 30 seconds
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Upload timed out (30s). This usually means the Bucket Name in Vercel is incorrect/typo, or permissions are blocked. Current Bucket Config: '${storage?.app.options.storageBucket}'`)), 30000);
    });

    try {
      const storageRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
      
      const snapshot = await Promise.race([
        uploadBytes(storageRef, file),
        timeoutPromise
      ]) as any;

      const downloadURL = await getDownloadURL(snapshot.ref);

      setContent(prev => ({
        ...prev,
        gallery: [downloadURL, ...prev.gallery]
      }));
    } catch (error) {
      console.error("Upload failed", error);
      throw error;
    }
  };

  const removeFromGallery = async (url: string) => {
     if (!storage) return;

     try {
       await ensureAuth(); // Ensure auth before delete
       if (url.includes('firebasestorage.googleapis.com')) {
         const storageRef = ref(storage, url);
         await deleteObject(storageRef);
       }

       setContent(prev => ({
          ...prev,
          gallery: prev.gallery.filter(item => item !== url)
       }));
     } catch (error) {
       console.error("Delete failed", error);
       alert("Failed to delete image. Check console.");
     }
  };

  // ------------------------------------------------------------------
  // AUTHENTICATION
  // ------------------------------------------------------------------
  const login = (passwordInput: string): boolean => {
    if (passwordInput === adminPassword) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const changePassword = (newPassword: string) => {
    setAdminPassword(newPassword);
    localStorage.setItem('tara_admin_pw', newPassword);
  };

  // ------------------------------------------------------------------
  // ANALYTICS LOGGING
  // ------------------------------------------------------------------
  const logVisit = async (path: string) => {
    if (!storage || path.startsWith('/admin')) return;

    // Ensure we have permission to write logs
    await ensureAuth();

    let sessionId = sessionStorage.getItem('tara_session_id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('tara_session_id', sessionId);
    }

    try {
      let country = 'Unknown';
      try {
        const geoRes = await fetch('https://api.country.is');
        if (geoRes.ok) {
           const geoData = await geoRes.json();
           country = geoData.country;
        }
      } catch (e) {
        country = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[0];
      }

      const logData = {
        path,
        timestamp: Date.now(),
        sessionId,
        country,
        userAgent: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language
      };

      const filename = `analytics/logs/${Date.now()}_${Math.random().toString(36).substr(2, 5)}.json`;
      const logRef = ref(storage, filename);
      
      await uploadString(logRef, JSON.stringify(logData), 'raw', {
        contentType: 'application/json'
      });
      
    } catch (err) {
      // Silent fail for analytics
    }
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
      login,
      logout,
      changePassword
    }}>
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
};
