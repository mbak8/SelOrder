import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './MainLayout.css';
import logo from '../../assets/agroselnet-logo-color.svg';

interface MainLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  username: string;
  t: (key: string) => string;
}

export const MainLayout = ({ children, onLogout, username, t }: MainLayoutProps) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
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
            <div style={{ marginBottom: 10, fontSize: '0.9em', color: '#666' }}>
              <strong>{username}</strong>
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

{/*
            <NavLink 
              to="/users" 
              className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}
              onClick={closeMenu}
            >
              👤 {t('Menu.Users')}
            </NavLink>
*/}


          </nav>

          <div className="sidebar-footer">
            <NavLink 
              to="/profile" 
              className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}
              onClick={closeMenu}
              // Dodajemy margines, żeby oddzielić go od przycisku Wyloguj
              style={{ marginBottom: '10px' }} 
            >
              ⚙️ Mój Profil
            </NavLink>

            <button onClick={onLogout} className="logout-btn">
              Wyloguj
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