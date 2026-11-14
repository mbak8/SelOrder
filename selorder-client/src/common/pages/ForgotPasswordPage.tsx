import { useState } from 'react';
import { Link } from 'react-router';
import { apiClient } from '../../api/client';
import { useTranslations } from '../context/TranslationContext';
import logo from '../../assets/agroselnet-logo-color.svg';

export const ForgotPasswordPage = () => {
  const { t, language, changeLanguage } = useTranslations();

  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      await apiClient.post('/api/auth/forgot-password', { email });
      
      setMessage({ 
        text: t('Auth.Forgot.SuccessMessage'), 
        type: 'success' 
      });
      setEmail(""); 
    } catch (err) {
      console.error(err);
      setMessage({ 
        text: t('Auth.Forgot.ErrorMessage'), 
        type: 'error' 
      });
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
            <img src={logo} alt="Logo" className="logo-image" />
        </div>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1 style={{ color: 'var(--color-on-surface)'}}>{t('Auth.Forgot.Title')}</h1>
        </div>
        
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em', color: 'var(--color-on-surface-variant)' }}>
              {t('Auth.Forgot.EmailLabel')}
            </label>
            <input 
              type="email"
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--color-outline-variant)', boxSizing: 'border-box', background: 'var(--color-surface-container-lowest)', color: 'var(--color-on-surface)' }}
              disabled={isSubmitting}
            />
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
            {isSubmitting ? t('Common.Loading') : t('Auth.Forgot.Submit')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 15 }}>
            <Link to="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '0.9em' }}>
                &larr; {t('Auth.Forgot.BackToLogin')}
            </Link>
        </div>

        {message && (
          <div style={{ 
            marginTop: 20, 
            padding: 10, 
            borderRadius: 8, 
            textAlign: 'center',
            background: message.type === 'success' ? 'var(--color-primary-container)' : 'var(--color-error-container)',
            color: message.type === 'success' ? 'var(--color-on-primary-container)' : 'var(--color-on-error-container)'
          }}>
            {message.text}
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