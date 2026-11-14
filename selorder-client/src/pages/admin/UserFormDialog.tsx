import { useEffect, useState } from 'react';
import { adminApi, MIN_PASSWORD_LENGTH, type AdminUser } from '../../api/adminApi';
import { useTranslations } from '../../common/context/TranslationContext';
import { LANGUAGES } from '../../common/languages';
import { adminErrorText } from './adminErrors';
import { AdminMessage } from './AdminMessage';

interface UserFormDialogProps {
  tenantId: string;
  user: AdminUser | null;   // null = nowy użytkownik
  onClose: () => void;
  onSaved: () => void;
}

interface UserForm {
  login: string;
  email: string;
  firstName: string;
  lastName: string;
  languageCode: string;
  isActive: boolean;
  password: string;
  confirm: string;
}

const toForm = (user: AdminUser | null): UserForm => ({
  login: user?.login ?? '',
  email: user?.email ?? '',
  firstName: user?.firstName ?? '',
  lastName: user?.lastName ?? '',
  languageCode: user?.languageCode ?? 'PL',
  isActive: user?.isActive ?? true,
  password: '',
  confirm: ''
});

// Puste pole tekstowe wysyłamy jako null (w bazie kolumny są NULL-owalne)
const orNull = (value: string) => (value.trim() === '' ? null : value.trim());

// Okno dodawania / edycji użytkownika klienta (panel administratora).
// Przy edycji puste hasło = bez zmian.
export const UserFormDialog = ({ tenantId, user, onClose, onSaved }: UserFormDialogProps) => {
  const { t } = useTranslations();
  const isNew = user === null;

  const [form, setForm] = useState<UserForm>(() => toForm(user));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Escape zamyka okno (kliknięcie w tło nie - żeby przypadkiem nie stracić wpisanych danych)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const set = <K extends keyof UserForm>(key: K, value: UserForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.login.trim() === '') {
      setError(t('Admin.Error.InvalidLogin', 'Login jest wymagany (najwyżej 100 znaków).'));
      return;
    }

    // Hasło: wymagane dla nowego użytkownika, przy edycji opcjonalne
    if (isNew || form.password !== '') {
      if (form.password.length < MIN_PASSWORD_LENGTH) {
        setError(t('Admin.Error.PasswordTooShort', `Hasło musi mieć co najmniej ${MIN_PASSWORD_LENGTH} znaków.`));
        return;
      }
      if (form.password !== form.confirm) {
        setError(t('Profile.ErrorPasswordMatch', 'Hasła nie są identyczne.'));
        return;
      }
    }

    const common = {
      login: form.login.trim(),
      email: orNull(form.email),
      firstName: orNull(form.firstName),
      lastName: orNull(form.lastName),
      languageCode: form.languageCode,
      isActive: form.isActive
    };

    setSaving(true);
    try {
      if (isNew) {
        await adminApi.createUser(tenantId, { ...common, password: form.password });
      } else {
        await adminApi.updateUser(tenantId, user.id, { ...common, newPassword: form.password === '' ? null : form.password });
      }
      onSaved();
    } catch (err) {
      setError(adminErrorText(err, t));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
        style={{
          background: 'white', color: '#333', borderRadius: 8,
          padding: '20px 24px', width: '100%', maxWidth: 560,
          maxHeight: '90vh', overflowY: 'auto', boxSizing: 'border-box',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
        }}
      >
        <h3 id="user-form-title" style={{ margin: '0 0 16px 0' }}>
          {isNew ? t('Admin.User.New', 'Nowy użytkownik') : t('Admin.User.Edit', 'Edycja użytkownika')}
        </h3>

        {error && <AdminMessage text={error} type="error" />}

        <form onSubmit={handleSubmit} noValidate autoComplete="off">
          <div className="form-grid-2">
            <div className="form-row">
              <label className="form-label" htmlFor="user-login">{t('Admin.User.Login', 'Login')} *</label>
              <input
                id="user-login"
                className="form-input"
                maxLength={100}
                autoComplete="off"
                autoFocus
                value={form.login}
                onChange={e => set('login', e.target.value)}
              />
            </div>
            <div className="form-row">
              <label className="form-label" htmlFor="user-email">{t('Profile.Email', 'E-mail')}</label>
              <input
                id="user-email"
                className="form-input"
                type="email"
                maxLength={255}
                autoComplete="off"
                value={form.email}
                onChange={e => set('email', e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-row">
              <label className="form-label" htmlFor="user-first-name">{t('Profile.FirstName', 'Imię')}</label>
              <input
                id="user-first-name"
                className="form-input"
                maxLength={100}
                value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
              />
            </div>
            <div className="form-row">
              <label className="form-label" htmlFor="user-last-name">{t('Profile.LastName', 'Nazwisko')}</label>
              <input
                id="user-last-name"
                className="form-input"
                maxLength={100}
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <label className="form-label" htmlFor="user-language">{t('Profile.Language', 'Język')}</label>
            <select
              id="user-language"
              className="form-input"
              value={form.languageCode}
              onChange={e => set('languageCode', e.target.value)}
            >
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>

          <div className="form-grid-2">
            <div className="form-row">
              <label className="form-label" htmlFor="user-password">
                {isNew ? `${t('Admin.User.Password', 'Hasło')} *` : t('Admin.User.NewPassword', 'Nowe hasło')}
              </label>
              <input
                id="user-password"
                className="form-input"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
              />
            </div>
            <div className="form-row">
              <label className="form-label" htmlFor="user-confirm">{t('Profile.ConfirmPassword', 'Powtórz hasło')}</label>
              <input
                id="user-confirm"
                className="form-input"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
              />
            </div>
          </div>
          <div style={{ marginTop: -8, marginBottom: 15, fontSize: '0.85em', color: '#777' }}>
            {isNew
              ? t('Admin.User.PasswordHint', `Co najmniej ${MIN_PASSWORD_LENGTH} znaków.`)
              : t('Admin.User.PasswordKeepHint', 'Pozostaw puste, aby nie zmieniać hasła.')}
          </div>

          <div className="form-row">
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={e => set('isActive', e.target.checked)}
              />
              {t('Admin.User.IsActive', 'Konto aktywne (może się logować)')}
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '10px 18px', cursor: 'pointer', background: 'white', color: '#333', border: '1px solid #ccc', borderRadius: 4 }}
            >
              {t('General.Cancel', 'Anuluj')}
            </button>
            <button type="submit" className="action-btn" disabled={saving}>
              {saving ? t('Common.Saving', 'Zapisywanie...') : t('General.Save', 'Zapisz')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
