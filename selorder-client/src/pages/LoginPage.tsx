import { useState } from 'react';
import { apiClient } from '../api/client';
import { useTranslations } from  '../context/TranslationContext';

// Definicja tego, co zwraca API (można to też wynieść do osobnego pliku typów)
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
  const { t } = useTranslations(); // Gotowe do tłumaczeń
  
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

      // Jeśli sukces, przekazujemy dane w górę do App.tsx
      onLoginSuccess(response.data);
      
    } catch (err) {
      console.error(err);
      setError("Błąd logowania! Sprawdź login i hasło.");
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
        <h2 style={{ textAlign: 'center', marginBottom: 20, color: '#333' }}>SelOrder</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em', color: '#666' }}>Login</label>
            <input 
              type="text" 
              value={login} 
              onChange={e => setLogin(e.target.value)} 
              style={{ width: '100%', padding: 10, borderRadius: 4, border: '1px solid #ddd', boxSizing: 'border-box' }}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 5, fontSize: '0.9em', color: '#666' }}>Hasło</label>
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
              background: isSubmitting ? '#ccc' : '#0056b3', 
              color: 'white', 
              border: 'none', 
              borderRadius: 4, 
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isSubmitting ? 'Logowanie...' : 'Zaloguj'}
          </button>
        </form>

        {error && (
          <div style={{ marginTop: 20, padding: 10, background: '#ffebee', color: '#c62828', borderRadius: 4, textAlign: 'center' }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};