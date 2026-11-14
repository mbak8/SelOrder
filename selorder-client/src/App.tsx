import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TranslationProvider, useTranslations } from './common/context/TranslationContext';
import { MainLayout } from './common/components/MainLayout';

import { LoginPage } from './common/pages/LoginPage'; 
import { ArticlesPage } from './pages/ArticlesPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailsPage } from './pages/OrderDetailsPage';
import ProfilePage from './common/pages/ProfilePage';
import { ForgotPasswordPage } from './common/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './common/pages/ResetPasswordPage';

// --- POPRAWKA TYPÓW ---
export interface LoginResponse {
  login: string;
  token: string;
  language: string;
  tenantId: string; // Zmieniono z number na string dla obsługi UUID
}

const AppContent = () => {
  const { t, loading, changeLanguage } = useTranslations();

  // Stan autoryzacji z pełną inicjalizacją z localStorage
  const [userData, setUserData] = useState<LoginResponse | null>(() => {
    const token = localStorage.getItem('token');
    const login = localStorage.getItem('login');
    const tenantId = localStorage.getItem('tenantId');
    const language = localStorage.getItem('language') || 'PL';

    if (token && login && tenantId) {
      return { login, token, language, tenantId };
    }
    return null;
  });

  // Synchronizacja języka TYLKO przy logowaniu (jednorazowo)
  useEffect(() => {
    if (userData?.language) {
      changeLanguage(userData.language);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.language]);

  const handleLoginSuccess = (data: LoginResponse) => {
    console.log("Zalogowano pomyślnie:", data);
    setUserData(data);
    localStorage.setItem('token', data.token);
    localStorage.setItem('login', data.login);
    localStorage.setItem('tenantId', data.tenantId);
    localStorage.setItem('language', data.language); // Zapamiętujemy język
    
    changeLanguage(data.language);
  };

  const handleLogout = () => {
    setUserData(null);
    localStorage.removeItem('token');
    localStorage.removeItem('login');
    localStorage.removeItem('tenantId');
    // Nie usuwamy 'language' – chcemy, by formularz logowania został w wybranym języku
  };

  // Obsługa automatycznego wylogowania przez zdarzenie systemowe (dla interceptora)
  useEffect(() => {
    const handleUnauthorized = () => handleLogout();
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#666' }}>
        <h2>⏳ {t('General.LoadingSystem', 'Trwa ładowanie systemu...')}</h2>
      </div>
    );
  }

  if (!userData) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
        
        {/* --- NOWE TRASY DLA NIEZALOGOWANYCH --- */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        
        {/* Każda inna ścieżka przekieruje na /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <MainLayout onLogout={handleLogout} username={userData.login} t={t}>
      <Routes>
        <Route path="/" element={<OrdersPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Jeśli zalogowany wejdzie na login/reset, przekieruj do aplikacji */}
        <Route path="/login" element={<Navigate to="/" />} />
        <Route path="/forgot-password" element={<Navigate to="/" />} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </MainLayout>
  );
};

function App() {
  return (
    <TranslationProvider>
      <AppContent />
    </TranslationProvider>
  );
}

export default App;