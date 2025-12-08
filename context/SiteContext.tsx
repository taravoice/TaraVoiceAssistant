// ---------------------------------------------
// FIXED PATH-BASED SITE CONTEXT
// ---------------------------------------------
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage, ensureAuth } from '../firebase';
import { ref, getDownloadURL, listAll, deleteObject, uploadString } from 'firebase/storage';

// Types
export interface CustomSection {
  id: string;
  title: string;
  content: string;
  image?: string;  // NOW stores path, not URL
  page: string; 
}

interface SiteImages {
  [key: string]: string; // stores ONLY storage paths like: "images/homeHeroBg.png"
}

interface SiteContent {
  home: {
    heroTitle: string;
    heroSubtitle: string;
    aboutTitle: string;
    aboutText: string;
  };
  customSections: CustomSection[];
  images: SiteImages;   // PATHS
  gallery: string[];    // FULL URLs (OK)
  resolvedImages: { [key: string]: string }; // NEW: Download URLs for rendering
  updatedAt: number;
}

interface SiteContextType {
  content: SiteContent;
  updateHomeContent: (key: keyof SiteContent['home'], value: any) => Promise<void>;
  addCustomSection: (section: CustomSection) => Promise<void>;
  removeCustomSection: (id: string) => Promise<void>;
  updateImage: (key: string, storagePath: string) => Promise<void>; // accepts path now
  uploadToGallery: (file: File) => Promise<void>;
  removeFromGallery: (url: string) => Promise<void>;
  logVisit: (path: string) => Promise<void>;
  isAuthenticated: boolean;
  isStorageConfigured: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  changePassword: (newPassword: string) => void;
  isInitialized: boolean;
}

// Default images (PATHS not URLs)
const defaultImages: SiteImages = {
  logo: "default/logo.png",
  homeHeroBg: "default/homeHeroBg.jpg",
  homeIndustry1: "default/homeIndustry1.jpg",
  homeIndustry2: "default/homeIndustry2.jpg",
  feature1: "default/feature1.jpg",
  feature2: "default/feature2.jpg",
  feature3: "default/feature3.jpg",
  feature4: "default/feature4.jpg",
  feature5: "default/feature5.jpg",
  feature6: "default/feature6.jpg",
};

const defaultContent: SiteContent = {
  home: {
    heroTitle: "AI Appointment Setter for Your Business",
    heroSubtitle: "Automate your scheduling 24/7 with human-like accuracy.",
    aboutTitle: "About Tara Voice Assistant",
    aboutText: "Tara is a cutting-edge AI solution designed for SMBs.",
  },
  customSections: [],
  images: defaultImages,
  resolvedImages: {},     // real URLs loaded at runtime
  gallery: [],
  updatedAt: 0
};

// ---------------------------------------------
// CONTEXT
// ---------------------------------------------
const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isStorageConfigured, setIsStorageConfigured] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const adminPassword = localStorage.getItem('tara_admin_pw') || '987654321';

  // Resolve storage paths → real image URLs
  const resolveAllImageURLs = useCallback(async (images: SiteImages) => {
    if (!storage) return {};

    const pairs = await Promise.all(
  Object.entries(images).map(async ([key, path]) => {
    try {
      if (!path) return [key, ""];

      const storageRef = ref(storage, String(path));
      const url = await getDownloadURL(storageRef);

      return [key, url];
    } catch {
      return [key, ""];
    }
  })
);


    return Object.fromEntries(pairs);
  }, []);

  // ---------------------------------------------
  // INITIAL LOAD
  // ---------------------------------------------
  useEffect(() => {
    const initSite = async () => {
      if (!storage) {
        setIsInitialized(true);
        return;
      }

      setIsStorageConfigured(true);

      // 1. Load cloud config (paths only)
      try {
        const configRef = ref(storage, "config/site_config.json");
        const baseUrl = await getDownloadURL(configRef);
        const freshUrl = `${baseUrl}?t=${Date.now()}`;
        const res = await fetch(freshUrl);

        if (res.ok) {
          const cloudConfig = await res.json();

          setContent(prev => ({
            ...prev,
            ...cloudConfig,
            resolvedImages: prev.resolvedImages,
            gallery: prev.gallery
          }));
        }
      } catch (e) {
        console.warn("Using defaults, cloud config missing.");
      }

      // 2. Load gallery URLs
      try {
        const galleryRef = ref(storage, "gallery/");
        const res = await listAll(galleryRef);
        const urls = await Promise.all(res.items.map(i => getDownloadURL(i)));

        setContent(prev => ({ ...prev, gallery: urls }));
      } catch {}

      // 3. Resolve image paths into real URLs
      const resolved = await resolveAllImageURLs(
        content.images || defaultImages
      );

      setContent(prev => ({ ...prev, resolvedImages: resolved }));

      setIsInitialized(true);
    };

    initSite();
  }, []);

  // ---------------------------------------------
  // SAVE CONFIG (paths only)
  // ---------------------------------------------
  const saveToCloud = useCallback(async (newContent: SiteContent) => {
    if (!storage) return;

    try {
      await ensureAuth();

      const configRef = ref(storage, "config/site_config.json");

      const { gallery, resolvedImages, ...saveData } = newContent; // remove derived values

      await uploadString(configRef, JSON.stringify(saveData), "raw", {
        contentType: "application/json",
        cacheControl: "no-cache, no-store, must-revalidate"
      });

    } catch (e) {
      console.error("Cloud save failed", e);
    }
  }, []);

  // ---------------------------------------------
  // IMAGE UPDATE (store PATH only)
  // ---------------------------------------------
  const updateImage = async (key: string, storagePath: string) => {
    setContent(prev => {
      const updated = {
        ...prev,
        images: {
          ...prev.images,
          [key]: storagePath
        },
        updatedAt: Date.now()
      };

      saveToCloud(updated);
      return updated;
    });

    // Re-resolve this one image URL
    const url = await getDownloadURL(ref(storage, storagePath));

    setContent(prev => ({
      ...prev,
      resolvedImages: {
        ...prev.resolvedImages,
        [key]: url
      }
    }));
  };

  // ---------------------------------------------
  // GALLERY UPLOAD
  // ---------------------------------------------
  const uploadToGallery = async (file: File) => {
    if (!storage) return;

    await ensureAuth();

    const path = `gallery/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    const { uploadBytes } = await import("firebase/storage");

    const snap = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snap.ref);

    setContent(prev => ({ ...prev, gallery: [url, ...prev.gallery] }));
  };

  // ---------------------------------------------
  // REMOVE FROM GALLERY
  // ---------------------------------------------
  const removeFromGallery = async (url: string) => {
    if (!storage) return;

    await ensureAuth();

    try {
      const r = ref(storage, url);
      await deleteObject(r);
    } catch {}

    setContent(prev => ({
      ...prev,
      gallery: prev.gallery.filter(i => i !== url)
    }));
  };

  // Auth, logging etc (unchanged)
  const login = (input: string) => {
    if (input === adminPassword) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => setIsAuthenticated(false);
  const changePassword = (pw: string) => localStorage.setItem("tara_admin_pw", pw);

  const logVisit = async (path: string) => {
    if (!storage || path.startsWith("/admin")) return;

    try {
      await ensureAuth();
      const sid = sessionStorage.getItem("t_sid") || Math.random().toString(36).substring(2);
      sessionStorage.setItem("t_sid", sid);

      const data = { path, timestamp: Date.now(), sid, ua: navigator.userAgent };
      const logRef = ref(storage, `analytics/logs/${Date.now()}.json`);
      await uploadString(logRef, JSON.stringify(data), "raw", { contentType: "application/json" });
    } catch {}
  };

  return (
    <SiteContext.Provider
      value={{
        content,
        updateHomeContent: async (key, value) =>
          setContent(prev => {
            const updated = { ...prev, home: { ...prev.home, [key]: value }, updatedAt: Date.now() };
            saveToCloud(updated);
            return updated;
          }),
        addCustomSection: async section =>
          setContent(prev => {
            const updated = { ...prev, customSections: [...prev.customSections, section], updatedAt: Date.now() };
            saveToCloud(updated);
            return updated;
          }),
        removeCustomSection: async id =>
          setContent(prev => {
            const updated = { ...prev, customSections: prev.customSections.filter(s => s.id !== id), updatedAt: Date.now() };
            saveToCloud(updated);
            return updated;
          }),

        updateImage,
        uploadToGallery,
        removeFromGallery,
        logVisit,

        isAuthenticated,
        isStorageConfigured,
        login,
        logout,
        changePassword,
        isInitialized
      }}
    >
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = () => {
  const ctx = useContext(SiteContext);
  if (!ctx) throw new Error("Site Context required");
  return ctx;
};
