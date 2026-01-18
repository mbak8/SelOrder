import { useState, useEffect } from 'react';
import { apiClient } from '../api/client'; // <--- Importujemy naszego klienta

type Dictionary = Record<string, string>;

export const useTranslations = () => {
  const [translations, setTranslations] = useState<Dictionary>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTranslations = async () => {
      try {
        // Używamy apiClient. Nie podajemy "http://localhost...", tylko końcówkę.
        // Token doda się sam dzięki interceptorowi z kroku 2.
        const response = await apiClient.get<Dictionary>('/api/translations');
        
        setTranslations(response.data);
      } catch (err) {
        // Cichy błąd - jeśli się nie uda (np. brak logowania), po prostu nie mamy tłumaczeń
        console.warn("Brak tłumaczeń lub błąd sieci"); 
      } finally {
        setLoading(false);
      }
    };

    fetchTranslations();
  }, []);

  const t = (key: string) => translations[key] || key;

  return { t, loading };
};