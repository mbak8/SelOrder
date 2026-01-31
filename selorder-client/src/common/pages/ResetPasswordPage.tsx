import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import logo from '../../assets/agroselnet-logo-color.svg';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Jeśli brak tokena w URL, wyświetlamy błąd od razu
  useEffect(() => {
    if (!token) {
        setMessage({ text: 'Brak tokena resetującego. Link może być nieprawidłowy.', type: 'error' });
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
        setMessage({ text: 'Hasła nie są identyczne.', type: 'error' });
        return;
    }
    if (passwords.new.length < 5) {
        setMessage({ text: 'Hasło musi mieć min. 5 znaków.', type: 'error' });
        return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      // Endpoint C#
      await apiClient.post('/api/auth/reset-password', { 
        token: token, 
        newPassword: passwords.new 
      });

      setMessage({ text: 'Hasło zostało zmienione! Przekierowanie do logowania...', type: 'success' });
      
      // Po 3 sekundach przekieruj do logowania
      setTimeout(() => navigate('/login'), 3000);

    } catch (err) {
      console.error(err);
      setMessage({ text: 'Link wygasł lub jest nieprawidłowy.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) return (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#f0f2f5' }}>
          Nieprawidłowy link. <Link to="/login" style={{marginLeft: 10}}>Wróć do logowania</Link>
      </div>
  );

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
        {/* LOGO */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
            <img src={logo} alt="Logo" className="logo-image" />
        </div>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h1>
              <span style={{ color: '#4ab26b' }}>Sel</span>
              <span style={{ color: '#000000' }}>Order</span>
            </h1>
            <p style={{ color: '#666', fontSize: '0.9em' }}>Ustaw nowe hasło</p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em', color: '#666' }}>
              Nowe hasło
            </label>
            <input 
              type="password" 
              required
              value={passwords.new} 
              onChange={e => setPasswords({...passwords, new: e.target.value})} 
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box' }}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em', color: '#666' }}>
              Powtórz hasło
            </label>
            <input 
              type="password" 
              required
              value={passwords.confirm} 
              onChange={e => setPasswords({...passwords, confirm: e.target.value})} 
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
              background: isSubmitting ? '#ccc' : '#4ab26b',
              color: 'white', 
              border: 'none', 
              borderRadius: 4, 
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isSubmitting ? 'Zapisywanie...' : 'Zmień hasło'}
          </button>
        </form>

        {message && (
          <div style={{ 
            marginTop: 20, 
            padding: 10, 
            borderRadius: 4, 
            textAlign: 'center',
            background: message.type === 'success' ? '#e8f5e9' : '#ffebee',
            color: message.type === 'success' ? '#2e7d32' : '#c62828'
          }}>
            {message.text}
          </div>
        )}
      </div>
    </div>
  );
};