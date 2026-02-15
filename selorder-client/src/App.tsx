import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { TranslationProvider, useTranslations } from './common/context/TranslationContext';
import { MainLayout } from './common/components/MainLayout';

// Import stron
import { LoginPage, type LoginResponse } from './common/pages/LoginPage';
import { ArticlesPage } from './pages/ArticlesPage';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailsPage } from './pages/OrderDetailsPage';
import ProfilePage from './common/pages/ProfilePage';
import { ForgotPasswordPage } from './common/pages/ForgotPasswordPage';
import { ResetPasswordPage } from './common/pages/ResetPasswordPage';

const AppContent = () => {
  const { t, loading } = useTranslations();

  // Stan autoryzacji
  const [userData, setUserData] = useState<LoginResponse | null>(() => {
    const token = localStorage.getItem('token');
    
    // --- ZMIANA 1: Pobieramy zapisany login z localStorage, zamiast wpisywać 'User' na sztywno
    const savedLogin = localStorage.getItem('login') || 'Użytkownik'; 
    
    // Używamy zmiennej savedLogin
    return token ? { login: savedLogin, token, language: 'PL', tenantId: 1 } : null;
  });

  // Funkcja, którą przekażemy do LoginPage
  const handleLoginSuccess = (data: LoginResponse) => {
    console.log("Zalogowano pomyślnie:", data);
    setUserData(data);
    localStorage.setItem('token', data.token);
    
    // --- ZMIANA 2: Zapisujemy prawdziwy login do localStorage podczas logowania
    localStorage.setItem('login', data.login); 
  };

  const handleLogout = () => {
    setUserData(null);
    localStorage.removeItem('token');
    
    // --- ZMIANA 3: Czyścimy login z pamięci przy wylogowaniu
    localStorage.removeItem('login'); 
  };

  // 1. Ekran ładowania (Translation Context)
  if (loading) {
    return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#666' }}>
            <h2>⏳ {t('General.LoadingSystem')}</h2>
        </div>
    );
  }

  // 2. Jeśli NIE zalogowany -> Pokaż trasy publiczne (Login, Reset hasła)
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

  // 3. Jeśli ZALOGOWANY -> Pokaż aplikację wewnątrz Layoutu
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