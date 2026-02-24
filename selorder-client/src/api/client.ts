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
      
      // A. Wyczyść śmieci
      localStorage.removeItem('token');
      localStorage.removeItem('login'); // Dodane zgodnie z wcześniejszymi ustaleniami
      
      // B. Jeśli nie jesteśmy już na stronie logowania, przekieruj nas tam
      if (window.location.pathname !== '/login') {
        // Używamy window.location dla twardego resetu stanu aplikacji
        window.location.href = '/login'; 
      }
    }
    
    // Zwróć błąd dalej, żeby komponent mógł go obsłużyć
    return Promise.reject(error);
  }
);