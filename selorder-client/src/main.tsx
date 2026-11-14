import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
// React Router v8: pakiet 'react-router-dom' został usunięty – wszystkie API (BrowserRouter, Routes, Link, hooki)
// importujemy bezpośrednio z 'react-router'. Aplikacja używa trybu deklaratywnego (BrowserRouter + <Routes>).
import { BrowserRouter } from 'react-router';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* 2. Otocz App routerem */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)