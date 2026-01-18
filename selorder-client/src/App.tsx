import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { apiClient } from './api/client';
import { useTranslations } from './hooks/useTranslations'; 
import { MainLayout } from './components/MainLayout';
import { ArticlesPage } from './pages/ArticlesPage';
import { OrdersPage } from './pages/OrdersPage';


// To jest nasz "Model" odpowiedzi z serwera
interface LoginResponse {
  login: string;
  token: string;
  language: string;
  tenantId: number;
}

function App() {
  // useState to odpowiednik properties w C#. 
  // Jak wywołasz setLogin(...), React przerysuje ten kawałek ekranu.
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState<string | null>(null);
  
  const [userData, setUserData] = useState<any>(() => {
  const token = localStorage.getItem('token');
  // Jeśli jest token w pamięci przeglądarki, udajemy że jesteśmy zalogowani
  return token ? { login: 'User', token } : null; 
});
  const { t } = useTranslations();

  // Funkcja obsługująca przycisk "Zaloguj"
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Nie przeładowuj strony (to standard w SPA)
    setError(null);

    try {
      // Używamy apiClient i krótkiej ścieżki
      const response = await apiClient.post<LoginResponse>('/api/login', {
        login: login,
        password: password
      });

      // Sukces!
      console.log("Dostałem token:", response.data);
      setUserData(response.data);
      
      // Zapisz token w przeglądarce (na razie w najprostszy sposób)
      localStorage.setItem('token', response.data.token);

    } catch (err) {
      setError("Błąd logowania! Sprawdź login i hasło.");
      console.error(err);
    }
  };

  const handleLogout = () => {
    setUserData(null);
    localStorage.removeItem('token');
  };

// --- WIDOK: ZALOGOWANY ---
  if (userData) {
    return (
      <MainLayout onLogout={handleLogout} username={userData.login} t={t}>
        {/* TU DZIEJE SIĘ MAGIA ROUTERA */}
        <Routes>
          <Route path="/" element={<OrdersPage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          {/* Jeśli wpisze głupoty, przekieruj na pulpit */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </MainLayout>
    );
  }

  // --- WIDOK: LOGOWANIE (Bez zmian) ---
  return (
    // ... Twój stary formularz logowania ...
    <div style={{ maxWidth: 400, margin: '100px auto', fontFamily: 'sans-serif', textAlign: 'center' }}>
        {/* ... kod formularza ... */}
        {/* (Możesz tu zostawić to co miałeś w poprzednim kroku) */}
        
        {/* Skrócona wersja dla czytelności tutaj: */}
        <h2>Logowanie</h2>
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
            <input type="text" placeholder="Login" value={login} onChange={e => setLogin(e.target.value)} style={{padding: 10}} />
            <input type="password" placeholder="Hasło" value={password} onChange={e => setPassword(e.target.value)} style={{padding: 10}} />
            <button type="submit" style={{padding: 10, background: '#0056b3', color: 'white', border: 'none'}}>Zaloguj</button>
        </form>
        {error && <p style={{color: 'red'}}>{error}</p>}
    </div>
  );
}

export default App;