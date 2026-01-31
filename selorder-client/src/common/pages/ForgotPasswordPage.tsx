import { useState } from 'react';
import { Link } from 'react-router-dom';
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
      // Endpoint, który stworzyliśmy w C#
      await apiClient.post('/api/auth/forgot-password', { email });
      
      // Sukces - wyświetlamy komunikat (nawet jeśli maila nie ma w bazie, dla bezpieczeństwa)
      setMessage({ 
        text: 'Jeśli podany adres istnieje w bazie, wysłaliśmy na niego link do resetu hasła.', 
        type: 'success' 
      });
      setEmail(""); // Czyścimy pole
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Wystąpił błąd połączenia.', type: 'error' });
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
        {/* LOGO I NAGŁÓWEK */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
            <img src={logo} alt="Logo" className="logo-image" />
        </div>
        <div style={{ textAlign: 'center', margin: '0px', padding: '0px', marginBottom: '20px' }}>
            <h1>
              <span style={{ color: '#4ab26b' }}>Sel</span>
              <span style={{ color: '#000000' }}>Order</span>
            </h1>
            <p style={{ color: '#666', fontSize: '0.9em' }}>Reset hasła</p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em', color: '#666' }}>
              Adres Email
            </label>
            <input 
              type="email" 
              required
              value={email} 
              onChange={e => setEmail(e.target.value)} 
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
            {isSubmitting ? 'Wysyłanie...' : 'Wyślij link resetujący'}
          </button>
        </form>

        {/* POWRÓT DO LOGOWANIA */}
        <div style={{ textAlign: 'center', marginTop: 15 }}>
            <Link to="/login" style={{ color: '#4ab26b', textDecoration: 'none', fontSize: '0.9em' }}>
                &larr; Wróć do logowania
            </Link>
        </div>

        {/* KOMUNIKATY */}
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

        {/* PRZEŁĄCZNIK JĘZYKA */}
        <div style={{ marginTop: 30, borderTop: '1px solid #eee', paddingTop: 15, textAlign: 'center' }}>
            <span style={{ fontSize: '0.85em', color: '#888', marginRight: 10 }}>Language / Język:</span>
            <select 
              value={language}
              onChange={(e) => changeLanguage(e.target.value)}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
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