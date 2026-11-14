import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useTranslations } from '../context/TranslationContext';
import logo from '../../assets/agroselnet-logo-color.svg';

export const ResetPasswordPage = () => {
  const { t } = useTranslations();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(() =>
    token ? null : { text: t('Auth.Reset.InvalidToken', 'Brak tokena resetującego. Link może być nieprawidłowy.'), type: 'error' }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      setMessage({ text: t('Auth.Reset.ErrorMismatch', 'Hasła nie są identyczne.'), type: 'error' });
      return;
    }
    if (passwords.new.length < 5) {
      setMessage({ text: t('Auth.Reset.ErrorTooShort', 'Hasło musi mieć min. 5 znaków.'), type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await apiClient.post('/api/auth/reset-password', { 
        token: token, 
        newPassword: passwords.new 
      });

      setMessage({ text: t('Auth.Reset.Success', 'Hasło zostało zmienione! Przekierowanie do logowania...'), type: 'success' });
      
      setTimeout(() => navigate('/login'), 3000);

    } catch {
      setMessage({ text: t('Auth.Reset.Expired', 'Link wygasł lub jest nieprawidłowy.'), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--color-surface, #f0f2f5)' }}>
      {t('Auth.Reset.InvalidToken', 'Nieprawidłowy link.')} <Link to="/login" style={{marginLeft: 10}}>{t('Auth.Reset.BackToLogin', 'Wróć do logowania')}</Link>
    </div>
  );

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: 'var(--color-surface, #f0f2f5)' 
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: 400, 
        padding: 40, 
        background: 'var(--color-surface-container-lowest, white)', 
        borderRadius: 16, 
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <img src={logo} alt="Logo" className="logo-image" />
        </div>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: 'var(--color-on-surface, #333)' }}>{t('Auth.Reset.Title', 'Ustaw nowe hasło')}</h1>
        </div>
        
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em', color: 'var(--color-on-surface-variant, #666)' }}>
              {t('Auth.Reset.NewPassword', 'Nowe hasło')}
            </label>
            <input 
              type="password"
              value={passwords.new} 
              onChange={e => setPasswords({...passwords, new: e.target.value})} 
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--color-outline-variant, #ddd)', boxSizing: 'border-box' }}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em', color: 'var(--color-on-surface-variant, #666)' }}>
              {t('Auth.Reset.ConfirmPassword', 'Powtórz hasło')}
            </label>
            <input 
              type="password"
              value={passwords.confirm} 
              onChange={e => setPasswords({...passwords, confirm: e.target.value})} 
              style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid var(--color-outline-variant, #ddd)', boxSizing: 'border-box' }}
              disabled={isSubmitting}
            />
          </div>

          <button 
            type="submit" 
            disabled={isSubmitting}
            style={{ 
              marginTop: 10,
              padding: 12, 
              background: isSubmitting ? 'var(--color-outline-variant, #ccc)' : 'var(--color-primary, #4ab26b)',
              color: isSubmitting ? 'var(--color-on-surface-variant, #666)' : 'var(--color-on-primary, white)', 
              border: 'none', 
              borderRadius: 8, 
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isSubmitting ? t('Auth.Reset.Saving', 'Zapisywanie...') : t('Auth.Reset.Submit', 'Zmień hasło')}
          </button>
        </form>

        {message && (
          <div style={{ 
            marginTop: 20, 
            padding: 10, 
            borderRadius: 8, 
            textAlign: 'center',
            background: message.type === 'success' ? 'var(--color-primary-container, #e8f5e9)' : 'var(--color-error-container, #ffebee)',
            color: message.type === 'success' ? 'var(--color-on-primary-container, #2e7d32)' : 'var(--color-on-error-container, #c62828)'
          }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};
