import axios from 'axios';

export const apiClient = axios.create({
  // Pamiętaj o swoim adresie IP, jeśli testujesz na telefonie
  baseURL: import.meta.env.VITE_API_URL, // Vite sam to podstawi
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Interceptor ŻĄDAŃ (To już miałeś - dodaje token do wysyłki)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 2. NOWOŚĆ: Interceptor ODPOWIEDZI (Obsługa błędów 401)
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
      
      // B. Jeśli nie jesteśmy już na stronie logowania, przekieruj nas tam
      if (window.location.pathname !== '/login') {
        // Używamy window.location dla twardego resetu stanu aplikacji
        window.location.href = '/login'; 
      }
    }
    
    // Zwróć błąd dalej, żeby komponent (np. OrdersPage) mógł obsłużyć inne błędy
    return Promise.reject(error);
  }
);