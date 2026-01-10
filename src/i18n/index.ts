import { createContext, useContext } from 'react';
import { translations, Language } from './translations';

type TranslationValue = (typeof translations)[Language];

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationValue;
}

export const LanguageContext = createContext<LanguageContextType>({
  language: 'ua',
  setLanguage: () => {},
  t: translations.ua,
});

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};

export { translations, type Language };
