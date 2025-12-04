import React, { createContext, useContext, useState } from 'react';

interface CustomSection {
  id: string;
  title: string;
  content: string;
  image?: string;
}

interface SiteContent {
  home: {
    heroTitle: string;
    heroSubtitle: string;
    aboutTitle: string;
    aboutText: string;
    customSections: CustomSection[];
  };
  // Add other pages as needed in the future
}

interface SiteContextType {
  content: SiteContent;
  updateHomeContent: (key: keyof SiteContent['home'], value: any) => void;
  addCustomSection: (section: CustomSection) => void;
  removeCustomSection: (id: string) => void;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

const defaultContent: SiteContent = {
  home: {
    heroTitle: "AI Appointment Setter for Your Business",
    heroSubtitle: "Automate your appointment scheduling and handle customer interactions 24/7 with human-like accuracy. Never miss a lead again.",
    aboutTitle: "About Tara Voice Assistant",
    aboutText: "Tara Voice Assistant is a cutting-edge AI-driven solution designed to empower small and medium-sized businesses with the tools they need to streamline customer interactions. It handles appointment scheduling, answers customer inquiries, and manages call-related tasks with human-like accuracy 24/7.",
    customSections: []
  }
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
      home: {
        ...prev.home,
        customSections: [...prev.home.customSections, section]
      }
    }));
  };

  const removeCustomSection = (id: string) => {
    setContent(prev => ({
      ...prev,
      home: {
        ...prev.home,
        customSections: prev.home.customSections.filter(s => s.id !== id)
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
