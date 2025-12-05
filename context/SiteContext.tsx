import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';

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
  updateHomeContent: (key: keyof SiteContent['home'], value: any) => void;
  addCustomSection: (section: CustomSection) => void;
  removeCustomSection: (id: string) => void;
  updateImage: (key: string, url: string) => void;
  uploadToGallery: (file: File) => Promise<void>;
  removeFromGallery: (url: string) => Promise<void>;
  isAuthenticated: boolean;
  isStorageConfigured: boolean;
  login: () => void;
  logout: () => void;
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

  // Fetch Firebase Images on Mount
  useEffect(() => {
    const fetchGallery = async () => {
      // Guard: If storage is null (keys missing), stop here to prevent crash
      if (!storage) {
        setIsStorageConfigured(false);
        return;
      }

      setIsStorageConfigured(true);

      try {
        const listRef = ref(storage, 'gallery/');
        const res = await listAll(listRef);
        
        // Explicitly type itemRef as any to avoid TS7006 error if types are missing
        const urls = await Promise.all(
          res.items.map((itemRef: any) => getDownloadURL(itemRef))
        );

        setContent(prev => ({
          ...prev,
          gallery: [...systemGallery, ...urls]
        }));
      } catch (error) {
        console.error("Error fetching gallery:", error);
        // If config is missing or error, we just fallback to default gallery
      }
    };

    fetchGallery();
  }, []);

  const updateHomeContent = (key: keyof SiteContent['home'], value: any) => {
    setContent(prev => ({
      ...prev,
      home: {
        ...prev.home,
        [key]: value
      }
    }));
  };

  const addCustomSection = (section: CustomSection) => {
    setContent(prev => ({
      ...prev,
      customSections: [...prev.customSections, section]
    }));
  };

  const removeCustomSection = (id: string) => {
    setContent(prev => ({
      ...prev,
      customSections: prev.customSections.filter(s => s.id !== id)
    }));
  };

  const updateImage = (key: string, url: string) => {
    setContent(prev => ({
      ...prev,
      images: {
        ...prev.images,
        [key]: url
      }
    }));
  };

  // Upload to Firebase Storage with Timeout prevention
  const uploadToGallery = async (file: File): Promise<void> => {
    if (!storage) {
      alert("Firebase connection missing. Check your API keys.");
      throw new Error("No storage connection");
    }

    console.log("Starting upload. Bucket:", storage.app.options.storageBucket);

    // Create a timeout promise that rejects after 30 seconds
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Upload timed out (30s). This usually means the Bucket Name in Vercel is incorrect, has a typo, or includes 'gs://'. Check Vercel Environment Variables.")), 30000);
    });

    try {
      const storageRef = ref(storage, `gallery/${Date.now()}_${file.name}`);
      
      // Use Promise.race to prevent infinite spinner
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

  // Remove from Firebase Storage
  const removeFromGallery = async (url: string) => {
     if (!storage) return;

     try {
       // Only try to delete if it's a firebase URL
       if (url.includes('firebasestorage.googleapis.com')) {
         // Create a reference from the URL
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

  const login = () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);

  return (
    <SiteContext.Provider value={{ 
      content, 
      updateHomeContent, 
      addCustomSection, 
      removeCustomSection,
      updateImage,
      uploadToGallery,
      removeFromGallery,
      isAuthenticated,
      isStorageConfigured,
      login,
      logout
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
