import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiClient } from '../../api/client';

interface TranslationContextType {
  t: (key: string) => string;
  loading: boolean;
  language: string;             // Obecny język
  changeLanguage: (lang: string) => void; // Funkcja do zmiany języka
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const getBrowserLanguage = () => {
  const browserLang = navigator.language || navigator.languages[0]; // np. "pl-PL" lub "en-US"
  const code = browserLang.split('-')[0].toUpperCase(); // bierzemy tylko "PL", "EN"
  
  // Sprawdzamy, czy obsługujemy ten język (żeby nie ustawić np. chińskiego)
  const supportedLanguages = ['PL', 'EN', 'DE', "RU"]; 
  return supportedLanguages.includes(code) ? code : 'PL'; // Fallback do PL
};

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  // 1. Inicjalizacja: LocalStorage -> Przeglądarka -> Domyślny
  const [language, setLanguageState] = useState<string>(() => {
    const saved = localStorage.getItem('language');
    if (saved) return saved;
    return getBrowserLanguage();
  });

  
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // 2. Funkcja, którą będziemy wywoływać z innych komponentów (np. z Profilu)
  const changeLanguage = (newLang: string) => {
    setLanguageState(newLang);
    localStorage.setItem('language', newLang); // Zapisujemy, żeby po odświeżeniu strony język został
  };

  // 3. Ten useEffect odpali się TERAZ przy każdej zmianie zmiennej 'language'
  
  useEffect(() => {
    const fetchTranslations = async () => {
      setLoading(true);
      try {
        // Używamy zmiennej ze stanu (language), a nie localStorage
        const response = await apiClient.get<Record<string, string>>(`/api/translations?lang=${language}`);
        setTranslations(response.data);
        
        // Opcjonalnie: Jeśli API wymaga nagłówka Accept-Language
        apiClient.defaults.headers.common['Accept-Language'] = language;
        
      } catch (err) {
        console.error("Błąd pobierania tłumaczeń", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTranslations();
  }, [language]); // <--- KLUCZOWE: Tablica zależności zawiera 'language'

  const t = (key: string): string => {
    return translations[key] || key;
  };

  return (
    <TranslationContext.Provider value={{ t, loading, language, changeLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslations = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslations must be used within a TranslationProvider');
  }
  return context;
};