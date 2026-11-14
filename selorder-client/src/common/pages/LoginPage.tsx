import { useState } from 'react';
import { Link } from 'react-router-dom'; // <--- 1. IMPORT
import { apiClient } from '../../api/client';
import { useTranslations } from '../context/TranslationContext';
import logo from '../../assets/agroselnet-logo-color.svg';

export interface LoginResponse {
  login: string;
  token: string;
  language: string;
  tenantId: string;
}

interface LoginPageProps {
  onLoginSuccess: (data: LoginResponse) => void;
}

export const LoginPage = ({ onLoginSuccess }: LoginPageProps) => {
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
        password: password,
        language: language
      });

      changeLanguage(response.data.language);
      onLoginSuccess(response.data);
      
    } catch (err) {
      console.error(err);
      setError(t('Auth.Login.ErrorCredential')); 
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
      background: 'var(--color-surface)' 
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: 400, 
        padding: 40, 
        background: 'var(--color-surface-container-lowest)', 
        borderRadius: 16, 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: '20px' }}>
          <img src={logo} alt="Logo" className="logo-image" />
      </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em', color: 'var(--color-on-surface-variant)' }}>
              {t('Auth.Login.Username')}
            </label>
            <input 
              type="text" 
              value={login} 
              onChange={e => setLogin(e.target.value)} 
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--color-outline-variant)', boxSizing: 'border-box', background: 'var(--color-surface-container-lowest)', color: 'var(--color-on-surface)' }}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em', color: 'var(--color-on-surface-variant)' }}>
              {t('Auth.Login.Password')}
            </label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--color-outline-variant)', boxSizing: 'border-box', background: 'var(--color-surface-container-lowest)', color: 'var(--color-on-surface)' }} 
              disabled={isSubmitting}
            />
          </div>

          <div style={{ textAlign: 'right', marginTop: -5 }}>
            <Link 
              to="/forgot-password" 
              style={{ fontSize: '0.85em', color: 'var(--color-primary)', textDecoration: 'none' }}
            >
              {t('Auth.Login.ForgotPassword')}
            </Link>
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              marginTop: 10,
              padding: 12, 
              background: isSubmitting ? 'var(--color-outline-variant)' : 'var(--color-primary)',
              color: isSubmitting ? 'var(--color-on-surface-variant)' : 'var(--color-on-primary)', 
              border: 'none', 
              borderRadius: 8, 
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isSubmitting ? t('Common.Loading') : t('Auth.Login.Submit')}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 20, padding: 10, background: 'var(--color-error-container)', color: 'var(--color-on-error-container)', borderRadius: 8, textAlign: 'center' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 30, borderTop: '1px solid var(--color-outline-variant)', paddingTop: 15, textAlign: 'center' }}>
            <span style={{ fontSize: '0.85em', color: 'var(--color-on-surface-variant)', marginRight: 10 }}>
                {t('Common.LanguageLabel')}
            </span>
            <select 
              value={language} 
              onChange={(e) => changeLanguage(e.target.value)} 
              style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-container-lowest)', color: 'var(--color-on-surface)' }}
            >
              <option value="PL">Polski</option>
              <option value="EN">English</option>
              <option value="DE">Deutsch</option>
            </select>
        </div>

      </div>
    </div>
  );
};