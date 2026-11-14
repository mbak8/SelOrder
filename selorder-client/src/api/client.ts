import axios from 'axios';

export const apiClient = axios.create({
  // baseURL zostało całkowicie usunięte - używamy ścieżek względnych (profesjonalny wzorzec)
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Interceptor ŻĄDAŃ (dodaje token do wysyłki)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Czy zalogowany użytkownik należy do tenanta nadrzędnego (claim "IsMaster" w tokenie JWT).
// Służy tylko do dopasowania widoku (np. kolumna "Klient") - uprawnienia egzekwuje serwer.
export const isMasterUser = (): boolean => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).IsMaster === 'true';
  } catch {
    return false;
  }
};

// 2. Interceptor ODPOWIEDZI (Obsługa błędów 401)
apiClient.interceptors.response.use(
  (response) => {
    // Jeśli sukces (200), po prostu oddaj dane
    return response;
  },
  (error) => {
    // Sprawdź, czy to błąd uwierzytelniania (401 Unauthorized)
    if (error.response && error.response.status === 401) {
      console.warn("Sesja wygasła lub token jest nieprawidłowy. Wylogowywanie...");
      
      // A. Wyczyść śmieci (Dodajemy tenantId dla pełnego bezpieczeństwa)
      localStorage.removeItem('token');
      localStorage.removeItem('login'); 
      localStorage.removeItem('tenantId');
      
      // B. Zamiast twardego przeładowania strony, emitujemy zdarzenie.
      // Plik App.tsx nasłuchuje na to zdarzenie i wykona "miękkie" wylogowanie w tle.
      window.dispatchEvent(new Event('auth-unauthorized'));
    }
    
    // Zwróć błąd dalej, żeby komponent mógł go obsłużyć (np. wyświetlić komunikat)
    return Promise.reject(error);
  }
);