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

const AppContent = () => {
  const { t, loading } = useTranslations();

  // Stan autoryzacji
  const [userData, setUserData] = useState<LoginResponse | null>(() => {
    const token = localStorage.getItem('token');
    // Tu uproszczenie - normalnie dekodujemy token lub trzymamy usera w localStorage
    return token ? { login: 'User', token, language: 'PL', tenantId: 1 } : null;
  });

  // Funkcja, którą przekażemy do LoginPage
  const handleLoginSuccess = (data: LoginResponse) => {
    console.log("Zalogowano pomyślnie:", data);
    setUserData(data);
    localStorage.setItem('token', data.token);
  };

  const handleLogout = () => {
    setUserData(null);
    localStorage.removeItem('token');
  };

  // 1. Ekran ładowania (Translation Context)
  if (loading) {
    return (
        <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#666' }}>
            <h2>⏳ {t('General.LoadingSystem')}</h2>
        </div>
    );
  }

  // 2. Jeśli NIE zalogowany -> Pokaż Login Page
  if (!userData) {
    return (
      <Routes>
        {/* Każda ścieżka przekieruje na LoginPage */}
        <Route path="*" element={<LoginPage onLoginSuccess={handleLoginSuccess} />} />
      </Routes>
    );
  }

  // 3. Jeśli ZALOGOWANY -> Pokaż aplikację
  return (
    <MainLayout onLogout={handleLogout} username={userData.login} t={t}>
      <Routes>
        <Route path="/" element={<OrdersPage />} />
        <Route path="/articles" element={<ArticlesPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
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