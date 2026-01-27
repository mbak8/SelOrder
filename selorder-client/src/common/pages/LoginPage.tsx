import { useState } from 'react';
import { apiClient } from '../../api/client';
import { useTranslations } from '../context/TranslationContext';
import logo from '../../assets/agroselnet-logo-color.svg';

export interface LoginResponse {
  login: string;
  token: string;
  language: string;
  tenantId: number;
}

interface LoginPageProps {
  onLoginSuccess: (data: LoginResponse) => void;
}

export const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
  // 1. Pobieramy changeLanguage oraz obecny język z kontekstu
  const { t, changeLanguage, language } = useTranslations();
  
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.post<LoginResponse>('/api/login', {
        login: login,
        password: password
      });

      // 2. KLUCZOWE: Nadpisujemy język przeglądarki językiem z profilu użytkownika
      // Dzięki temu po wejściu do aplikacji user widzi swój preferowany język
      changeLanguage(response.data.language);

      // Przekazujemy dane dalej
      onLoginSuccess(response.data);
      
    } catch (err) {
      console.error(err);
      // Używamy klucza tłumaczenia dla błędu
      setError(t('Login.ErrorCredential')); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#f0f2f5' 
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: 400, 
        padding: 40, 
        background: 'white', 
        borderRadius: 8, 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <img src={logo} alt="Logo" className="logo-image" />
      </div>
        <div style={{ textAlign: 'center', margin: '0px', padding: '0px' }}>
            <h1>
              <span style={{ color: '#4ab26b' }}>Sel</span>
              <span style={{ color: '#000000' }}>Order</span>
            </h1>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em', color: '#666' }}>
              {t('Login.Username')}
            </label>
            <input 
              type="text" 
              value={login} 
              onChange={e => setLogin(e.target.value)} 
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box' }}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em', color: '#666' }}>
              {t('Login.Password')}
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box' }} 
              disabled={isSubmitting}
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              marginTop: 10,
              padding: 12, 
              background: isSubmitting ? '#ccc' : '#4ab26b', // Twój zielony kolor
              color: 'white', 
              border: 'none', 
              borderRadius: 4, 
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isSubmitting ? t('Login.Loading') : t('Login.Submit')}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 20, padding: 10, background: '#ffebee', color: '#c62828', borderRadius: 4, textAlign: 'center' }}>
            {error}
          </div>
        )}

        {/* 3. PRZEŁĄCZNIK JĘZYKA (Dla niezalogowanych) */}
        <div style={{ marginTop: 30, borderTop: '1px solid #eee', paddingTop: 15, textAlign: 'center' }}>
            <span style={{ fontSize: '0.85em', color: '#888', marginRight: 10 }}>Language / Język:</span>
            <select 
              value={language} // Bierzemy wartość z Contextu
              onChange={(e) => changeLanguage(e.target.value)} // Zmieniamy w Context (co przeładuje teksty)
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="PL">Polski</option>
              <option value="EN">English</option>
              <option value="DE">Deutsch</option>
              <option value="RU">Русский</option>
            </select>
        </div>

      </div>
    </div>
  );
};