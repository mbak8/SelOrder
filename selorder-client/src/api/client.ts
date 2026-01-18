import axios from 'axios';

// 1. Tworzymy instancję z bazowym adresem z pliku .env
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // Vite sam to podstawi
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Interceptor (Middleware) - Automatyczne dodawanie tokena
// Dzięki temu nie musisz ręcznie pisać "Authorization: Bearer..." w każdym zapytaniu!
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});