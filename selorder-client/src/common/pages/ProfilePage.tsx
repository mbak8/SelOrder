import React, { useEffect, useState } from 'react';
import { profileApi, type UserProfile } from '../../api/profileApi';
import { isAxiosError } from 'axios';
import { useTranslations } from '../context/TranslationContext'; // Import hooka

const ProfilePage: React.FC = () => {
  const { t, changeLanguage } = useTranslations();

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
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Pobranie danych przy wejściu
  useEffect(() => {
    let ignore = false;
    const loadData = async () => {
      try {
        const data = await profileApi.getProfile();
        if (!ignore) {
          setProfile(data);
        }
      } catch (err) {
        console.error(err);
        // Fallback jeśli API nie działa, żebyś widział formularz
        if (!ignore) {
          setProfile({ userId: 0, login: 'jan', firstName: 'Jan', lastName: 'Kowalski', email: 'jan@test.pl', languageCode: 'PL' });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, []);

  // Zapis danych
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      await profileApi.updateProfile(profile);
      changeLanguage(profile.languageCode); // Natychmiastowa zmiana języka interfejsu

      // Opcjonalnie: Zaktualizuj localStorage, żeby język przetrwał odświeżenie strony (F5)
      localStorage.setItem('language', profile.languageCode);

      setMessage({ text: t('Profile.SuccessSave'), type: 'success' });
    } catch (err) {
      // 400 = e-mail zajęty przez inne konto (e-mail jest unikalny, bo służy też do logowania)
      const emailTaken = isAxiosError(err) && err.response?.status === 400;
      setMessage({
        text: emailTaken
          ? t('Profile.ErrorEmailTaken', 'Ten adres e-mail jest już używany przez inne konto.')
          : t('Profile.ErrorSave'),
        type: 'error'
      });
    }
  };

  // Zmiana hasła
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (passwordData.new !== passwordData.confirm) {
      setMessage({ text: t('Profile.ErrorPasswordMatch'), type: 'error' });
      return;
    }

    try {
      await profileApi.changePassword({
        currentPassword: passwordData.current,
        newPassword: passwordData.new
      });
      setMessage({ text: t('Profile.SuccessPasswordChange'), type: 'success' });
      setPasswordData({ current: '', new: '', confirm: '' });
    } catch {
      setMessage({ text: t('Profile.ErrorPasswordChange'), type: 'error' });
    }
  };

  if (loading) return <div style={{ padding: 20 }}>{t('Common.Loading')}</div>;

  return (
    <div className="details-view-container">
      <h2 className="section-title">{t('Profile.Title')}</h2>

      {/* Komunikat sukcesu/błędu */}
      {message && (
        <div style={{
          padding: '16px', marginBottom: '20px', borderRadius: '12px',
          backgroundColor: message.type === 'success' ? 'var(--color-primary-container)' : 'var(--color-error-container)',
          color: message.type === 'success' ? 'var(--color-on-primary-container)' : 'var(--color-on-error-container)',
          border: `1px solid ${message.type === 'success' ? 'var(--color-primary)' : 'var(--color-error)'}`
        }}>
          {message.text}
        </div>
      )}

      {/* KARTA 1: DANE PODSTAWOWE */}
      <div className="data-card">
        <h3>{t('Profile.UserData')}</h3>
        <form onSubmit={handleSaveProfile} noValidate>
          <div className="form-grid-2">
            <div className="form-row">
              <label className="form-label">{t('Profile.FirstName')}</label>
              <input
                className="form-input"
                value={profile.firstName}
                onChange={e => setProfile({ ...profile, firstName: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label className="form-label">{t('Profile.LastName')}</label>
              <input
                className="form-input"
                value={profile.lastName}
                onChange={e => setProfile({ ...profile, lastName: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">{t('Profile.Email')}</label>
            <input
              className="form-input"
              type="email"
              value={profile.email}
              onChange={e => setProfile({ ...profile, email: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label className="form-label">{t('Profile.Language')}</label>
            <select
              className="form-input"
              value={profile.languageCode}
              onChange={e => setProfile({ ...profile, languageCode: e.target.value })}
            >
              <option value="PL">Polski</option>
              <option value="EN">English</option>
              <option value="DE">Deutsch</option>
              <option value="RU">Русский</option>
            </select>
          </div>

          <button type="submit" className="action-btn">{t('Profile.Save')}</button>
        </form>
      </div>

      {/* KARTA 2: ZMIANA HASŁA */}
      <div className="data-card">
        <h3>{t('Profile.Security')}</h3>
        <form onSubmit={handleChangePassword} noValidate>
          <div className="form-row">
            <label className="form-label">{t('Profile.CurrentPassword')}</label>
            <input
              className="form-input"
              type="password"
              value={passwordData.current}
              onChange={e => setPasswordData({ ...passwordData, current: e.target.value })}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-row">
              <label className="form-label">{t('Profile.NewPassword')}</label>
              <input
                className="form-input"
                type="password"
                value={passwordData.new}
                onChange={e => setPasswordData({ ...passwordData, new: e.target.value })}
              />
            </div>
            <div className="form-row">
              <label className="form-label">{t('Profile.ConfirmPassword')}</label>
              <input
                className="form-input"
                type="password"
                value={passwordData.confirm}
                onChange={e => setPasswordData({ ...passwordData, confirm: e.target.value })}
              />
            </div>
          </div>

          <button type="submit" className="action-btn">{t('Profile.ChangePasswordBtn')}</button>
        </form>
      </div>

    </div>
  );
};

export default ProfilePage;
