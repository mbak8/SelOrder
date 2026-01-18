import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom'; // <--- IMPORT
import './Layout.css';

// 1. IMPORTUJEMY LOGO (ścieżka zależy od tego, gdzie jest plik)
// Skoro jesteśmy w 'components', musimy wyjść o jeden poziom w górę (..) do 'assets'
import logo from '../assets/agroselnet-logo-color.svg';

interface MainLayoutProps {
  children: ReactNode;      // To co wyświetlimy w środku (treść)
  onLogout: () => void;     // Funkcja do wylogowania przekazana z App
  username?: string;        // Opcjonalnie nazwa użytkownika
  t: (key: string) => string; // <--- Przekazujemy funkcję tłumaczącą
}

export const MainLayout = ({ children, onLogout, username, t }: MainLayoutProps) => {
  return (
    <div className="app-container">
      
      {/* 1. HEADER */}
      <header className="top-header">
           {/* 2. ZAMIENIAMY TEKST NA OBRAZEK */}
        <div className="logo-container">
            <img src={logo} alt="AgroSelNet Logo" className="logo-image" />
        </div>
        <div>
            <h2>SelOrder</h2>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <span>{username}</span>
          <button 
            onClick={onLogout}
            style={{ padding: '5px 15px', background: 'white', color: '#0056b3', border: 'none', cursor: 'pointer', borderRadius: 4 }}
          >
            Wyloguj
          </button>
        </div>
      </header>


<div className="main-body">
        {/* SIDEBAR - Zmieniamy divy na NavLink */}
        <aside className="sidebar">
           
          <NavLink to="/orders" className="menu-item">
            🛒 {t('Menu.Orders')}
          </NavLink>

          <NavLink to="/articles" className={({ isActive }) => isActive ? "menu-item active" : "menu-item"}>
            📦 {t('Menu.Articles')}
          </NavLink>

          <NavLink to="/users" className="menu-item">
            👤 {t('Menu.Users')}
          </NavLink>

        </aside>

        {/* CONTENT */}
        <main className="content-area">
          {children}
        </main>
      </div>
    </div>
  );
};