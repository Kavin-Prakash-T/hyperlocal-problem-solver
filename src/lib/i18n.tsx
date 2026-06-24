import React, { createContext, useContext, useState } from 'react';
import en from '../locales/en.json';
import ta from '../locales/ta.json';
import hi from '../locales/hi.json';

export type Language = 'en' | 'ta' | 'hi';

export interface LanguageOption {
  code: Language;
  name: string;
}

export const languages: LanguageOption[] = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'hi', name: 'हिन्दी' }
];

const translations = { en, ta, hi };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof en, replace?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('community_hero_language') as Language;
    return (saved && (saved === 'en' || saved === 'ta' || saved === 'hi')) ? saved : 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('community_hero_language', lang);
  };

  const t = (key: keyof typeof en, replace?: Record<string, string | number>): string => {
    const langDict = (translations[language] || translations.en) as any;
    let text = langDict[key] || (translations.en as any)[key] || String(key);
    
    if (replace) {
      Object.entries(replace).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
