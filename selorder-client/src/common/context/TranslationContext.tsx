import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiClient } from '../api/client';

interface TranslationContextType {
  t: (key: string) => string;
  loading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Pobieramy tłumaczenia TYLKO RAZ przy starcie aplikacji
  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        // Zakładamy, że userContext trzyma język, tutaj dla uproszczenia hardcodujemy lub bierzemy z localStorage
        // Jeśli masz logikę języka w innym miejscu, dostosuj parametr
        const lang = localStorage.getItem('language') || 'PL';
        
        const response = await apiClient.get<Record<string, string>>(`/api/translations?lang=${lang}`);
        setTranslations(response.data);
      } catch (err) {
        console.error("Błąd pobierania tłumaczeń", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTranslations();
  }, []);

  // Funkcja tłumacząca
  const t = (key: string): string => {
    return translations[key] || key;
  };

  return (
    <TranslationContext.Provider value={{ t, loading }}>
      {children}
    </TranslationContext.Provider>
  );
};

// Hook do łatwego użycia w komponentach
export const useTranslations = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslations must be used within a TranslationProvider');
  }
  return context;
};