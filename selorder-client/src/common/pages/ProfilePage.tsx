import React, { useEffect, useState } from 'react';
import { profileApi, type UserProfile } from '../../api/profileApi';
import { useTranslations } from '../context/TranslationContext'; // Import hooka

const ProfilePage: React.FC = () => {
  // Stan formularza danych
  const [profile, setProfile] = useState<UserProfile>({
    userId: 0,
    login: '',
    firstName: '',
    lastName: '',
    email: '',
    languageCode: 'PL'
  });

  // Stan formularza hasła
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{text: string, type: 'success'|'error'} | null>(null);
  const { t, changeLanguage } = useTranslations();

  // Pobranie danych przy wejściu
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await profileApi.getProfile();
      setProfile(data);
    } catch (err) {
      console.error(err);
      // Fallback jeśli API nie działa, żebyś widział formularz
      setProfile({ userId: 0, login: 'jan', firstName: 'Jan', lastName: 'Kowalski', email: 'jan@test.pl', languageCode: 'PL' });
    } finally {
      setLoading(false);
    }
  };

  // Zapis danych
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await profileApi.updateProfile(profile);
      changeLanguage(profile.languageCode);
      setMessage({ text: 'Dane zapisane pomyślnie.', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Błąd zapisu danych.', type: 'error' });
    }
  };

  // Zmiana hasła
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwordData.new !== passwordData.confirm) {
      setMessage({ text: 'Nowe hasła muszą być identyczne.', type: 'error' });
      return;
    }

    try {
      await profileApi.changePassword({ 
        currentPassword: passwordData.current, 
        newPassword: passwordData.new 
      });
      setMessage({ text: 'Hasło zostało zmienione.', type: 'success' });
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch (err) {
      setMessage({ text: 'Nie udało się zmienić hasła (sprawdź stare hasło).', type: 'error' });
    }
  };

  if (loading) return <div style={{padding: 20}}>Ładowanie...</div>;

  return (
    <div className="details-view-container">
      <h2 className="section-title">Mój Profil</h2>

      {/* Komunikat sukcesu/błędu */}
      {message && (
        <div style={{
          padding: '15px', marginBottom: '20px', borderRadius: '8px',
          backgroundColor: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
          border: `1px solid ${message.type === 'success' ? '#c3e6cb' : '#f5c6cb'}`
        }}>
          {message.text}
        </div>
      )}

      {/* KARTA 1: DANE PODSTAWOWE */}
      <div className="data-card">
        <h3>Dane użytkownika</h3>
        <form onSubmit={handleSaveProfile}>
          <div className="form-grid-2">
            <div className="form-row">
              <label className="form-label">Imię</label>
              <input 
                className="form-input" 
                value={profile.firstName}
                required
                onInvalid={(e) => (e.target as HTMLInputElement).setCustomValidity('To pole jest wymagane!')}
                onChange={e => setProfile({...profile, firstName: e.target.value})}
              />
            </div>
            <div className="form-row">
              <label className="form-label">Nazwisko</label>
              <input 
                className="form-input" 
                value={profile.lastName}
                onChange={e => setProfile({...profile, lastName: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Email</label>
            <input 
              className="form-input" 
              type="email"              
              value={profile.email}
              onChange={e => setProfile({...profile, email: e.target.value})}
            />
          </div>

          <div className="form-row">
            <label className="form-label">Język aplikacji</label>
            <select 
              className="form-input"
              value={profile.languageCode}
              onChange={e => setProfile({...profile, languageCode: e.target.value})}
            >
              <option value="PL">Polski</option>
              <option value="EN">English</option>
              <option value="DE">Deutsch</option>
              <option value="RU">Русский</option>
            </select>
          </div>

          <button type="submit" className="action-btn">Zapisz zmiany</button>
        </form>
      </div>

      {/* KARTA 2: ZMIANA HASŁA */}
      <div className="data-card">
        <h3>Bezpieczeństwo</h3>
        <form onSubmit={handleChangePassword}>
          <div className="form-row">
            <label className="form-label">Obecne hasło</label>
            <input 
              className="form-input" 
              type="password"
              required
              value={passwordData.current}
              onChange={e => setPasswordData({...passwordData, current: e.target.value})}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-row">
              <label className="form-label">Nowe hasło</label>
              <input 
                className="form-input" 
                type="password"
                required
                minLength={5}
                value={passwordData.new}
                onChange={e => setPasswordData({...passwordData, new: e.target.value})}
              />
            </div>
            <div className="form-row">
              <label className="form-label">Powtórz nowe hasło</label>
              <input 
                className="form-input" 
                type="password"
                required
                minLength={5}
                value={passwordData.confirm}
                onChange={e => setPasswordData({...passwordData, confirm: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" className="action-btn">Zmień hasło</button>
        </form>
      </div>

    </div>
  );
};

export default ProfilePage;