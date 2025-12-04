import React, { createContext, useContext, useState } from 'react';

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
}

interface SiteContextType {
  content: SiteContent;
  updateHomeContent: (key: keyof SiteContent['home'], value: any) => void;
  addCustomSection: (section: CustomSection) => void;
  removeCustomSection: (id: string) => void;
  updateImage: (key: string, url: string) => void;
  isAuthenticated: boolean;
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

const defaultContent: SiteContent = {
  home: {
    heroTitle: "AI Appointment Setter for Your Business",
    heroSubtitle: "Automate your appointment scheduling and handle customer interactions 24/7 with human-like accuracy. Never miss a lead again.",
    aboutTitle: "About Tara Voice Assistant",
    aboutText: "Tara Voice Assistant is a cutting-edge AI-driven solution designed to empower small and medium-sized businesses with the tools they need to streamline customer interactions. It handles appointment scheduling, answers customer inquiries, and manages call-related tasks with human-like accuracy 24/7.",
  },
  customSections: [],
  images: defaultImages
};

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  const login = () => setIsAuthenticated(true);
  const logout = () => setIsAuthenticated(false);

  return (
    <SiteContext.Provider value={{ 
      content, 
      updateHomeContent, 
      addCustomSection, 
      removeCustomSection,
      updateImage,
      isAuthenticated,
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
