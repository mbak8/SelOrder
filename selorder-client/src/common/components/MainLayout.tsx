import { useState } from 'react';
import { NavLink } from 'react-router';
import { isMasterUser } from '../../api/client';
// Zwróć uwagę na poprawną ścieżkę do Twojego kontekstu, dostosuj ją jeśli jest inna!
import { useTranslations } from '../context/TranslationContext'; 
import './MainLayout.css';
import logo from '../../assets/agroselnet-logo-color.svg';

interface MainLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  username: string;
  t: (key: string, fallback?: string) => string;
}

export const MainLayout = ({ children, onLogout, username, t }: MainLayoutProps) => {

  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Użytkownik tenanta nadrzędnego widzi pozycję "Administracja"
  const [isMaster] = useState(isMasterUser);

  // 1. Pobieramy stan i funkcję do zmiany języka z Contextu
  const { language, changeLanguage } = useTranslations(); 
  
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="app-container">
      
      {/* 1. HEADER DESKTOP */}
      <div className="desktop-header">
        <div className="logo-container">
            <img src={logo} alt="Logo" className="logo-image" />
        </div>
        <div>
            <h2>
              <span style={{ color: '#4ab26b' }}>Sel</span>
              <span style={{ color: '#000000' }}>Order</span>
            </h2>
        </div>
      </div>

      {/* 2. HEADER MOBILE (Widoczny tylko na telefonie) */}
      <div className="mobile-header">
         {/* Lewa strona: Hamburger */}
         <button className="hamburger-btn" onClick={() => setMobileMenuOpen(true)}>
           ☰
         </button>

         {/* Środek: Tytuł (zwykły div, bez marginesów h2) */}
         <div className="mobile-logo-text">
            <span style={{ color: '#4ab26b' }}>Sel</span>
            <span style={{ color: '#000000' }}>Order</span>
         </div>
      </div>      

      {/* 3. OVERLAY (Tylko mobile) */}
      {isMobileMenuOpen && (
        <div className="overlay" onClick={closeMenu} />
      )}

      {/* 4. GŁÓWNA CZĘŚĆ (Sidebar + Content obok siebie) */}
      <div className="layout-body">
        
        <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="sidebar-header">
            {/* Długi login (np. e-mail) zawijamy zamiast ucinać: miejsce łamania po "@", pełna nazwa w podpowiedzi */}
            <div
              className="sidebar-username"
              title={username}
              style={{ marginBottom: 10, fontSize: '0.9em', color: '#666', minWidth: 0, overflowWrap: 'anywhere' }}
            >
              <strong>
                {username.includes('@')
                  ? <>{username.slice(0, username.indexOf('@') + 1)}<wbr />{username.slice(username.indexOf('@') + 1)}</>
                  : username}
              </strong>
            </div>
            <span className="close-btn" onClick={closeMenu}>✕</span>
          </div>

          <nav className="sidebar-nav">
            <NavLink 
              to="/orders" 
              className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}
              onClick={closeMenu}
            >
              🛒 {t('Menu.Orders')}
            </NavLink>

            <NavLink 
              to="/articles" 
              className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}
              onClick={closeMenu}
            >
              📦 {t('Menu.Articles')}
            </NavLink>

            {/* Panel administratora - tylko tenant nadrzędny (uprawnienia i tak sprawdza serwer) */}
            {isMaster && (
              <NavLink
                to="/admin/clients"
                className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}
                onClick={closeMenu}
              >
                🛠️ {t('Menu.Admin', 'Administracja')}
              </NavLink>
            )}
          </nav>

          <div className="sidebar-footer">
            



            <NavLink 
              to="/profile" 
              className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}
              onClick={closeMenu}
              // Dodajemy margines, żeby oddzielić go od przycisku Wyloguj
            >
              ⚙️ {t('General.Profile') || 'Mój Profil'}
            </NavLink>

                    <div style={{ marginBottom: 15, borderTop: '1px solid #eee', textAlign: 'center' }}>
            <select 
              value={language} 
              onChange={(e) => changeLanguage(e.target.value)} 
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="PL">Polski</option>
              <option value="EN">English</option>
              <option value="DE">Deutsch</option>
              <option value="RU">Русский</option>
            </select>
        </div> 

            <button onClick={onLogout} className="logout-btn">
              {t('General.Logout') || 'Wyloguj'}
            </button>
          </div>
        </aside>

        <main className="content">
          {children}
        </main>
      
      </div>
    </div>
  );
};