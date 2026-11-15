import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { adminApi, type AdminUser, type Tenant } from '../../api/adminApi';
import { DataGrid, type Column } from '../../common/components/DataGrid';
import { useTranslations } from '../../common/context/TranslationContext';
import { LANGUAGES } from '../../common/languages';
import { ActiveBadge, MasterBadge } from './AdminBadges';
import { adminErrorText } from './adminErrors';
import { AdminMessage, type AdminMessageType } from './AdminMessage';
import { UserFormDialog } from './UserFormDialog';

interface TenantForm {
  code: string;
  erpCode: string;
  companyName: string;
  isActive: boolean;
}

// Pusty kod ERP wysyłamy jako null (brak kodu)
const orNull = (value: string) => (value.trim() === '' ? null : value.trim());

type Message = { text: string; type: AdminMessageType };

// Okno użytkownika: zamknięte, nowy użytkownik albo edycja istniejącego
type UserDialogState = { open: false } | { open: true; user: AdminUser | null };

// Panel administratora: karta klienta (dane + lista użytkowników). /admin/clients/new = nowy klient.
export const ClientDetailsPage = () => {
  const { t } = useTranslations();
  const navigate = useNavigate();
  const { id = 'new' } = useParams();
  const isNew = id === 'new';

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [form, setForm] = useState<TenantForm>({ code: '', erpCode: '', companyName: '', isActive: true });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);
  const [userDialog, setUserDialog] = useState<UserDialogState>({ open: false });

  const loadUsers = useCallback(async () => {
    if (isNew) return;
    try {
      setUsers(await adminApi.getUsers(id));
    } catch (err) {
      setMessage({ text: adminErrorText(err, t), type: 'error' });
    }
  }, [id, isNew, t]);

  // Wczytanie klienta (także po przejściu z /admin/clients/new na kartę nowo utworzonego klienta).
  // Nowy klient startuje z pustym formularzem ze stanu początkowego.
  useEffect(() => {
    if (isNew) return;

    let ignore = false;
    const load = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const [loadedTenant, loadedUsers] = await Promise.all([adminApi.getTenant(id), adminApi.getUsers(id)]);
        if (ignore) return;
        setTenant(loadedTenant);
        setForm({
          code: loadedTenant.code,
          erpCode: loadedTenant.erpCode ?? '',
          companyName: loadedTenant.companyName,
          isActive: loadedTenant.isActive
        });
        setUsers(loadedUsers);
      } catch (err) {
        if (ignore) return;
        console.error('Błąd pobierania klienta', err);
        setNotFound(true);
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => { ignore = true; };
  }, [id, isNew]);

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);
    try {
      const erpCode = orNull(form.erpCode);
      if (isNew) {
        const created = await adminApi.createTenant({ code: form.code, erpCode, companyName: form.companyName, isActive: form.isActive });
        setMessage({ text: t('Admin.Client.Created', 'Klient został dodany. Możesz teraz dodać jego użytkowników.'), type: 'success' });
        navigate(`/admin/clients/${created.id}`, { replace: true });
      } else {
        await adminApi.updateTenant(id, { erpCode, companyName: form.companyName, isActive: form.isActive });
        setTenant(prev => prev && { ...prev, erpCode, companyName: form.companyName.trim(), isActive: form.isActive });
        setForm(prev => ({ ...prev, erpCode: erpCode ?? '' }));
        setMessage({ text: t('Admin.Saved', 'Zmiany zostały zapisane.'), type: 'success' });
      }
    } catch (err) {
      setMessage({ text: adminErrorText(err, t), type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const closeUserDialog = useCallback(() => setUserDialog({ open: false }), []);

  const handleUserSaved = useCallback(async () => {
    setUserDialog({ open: false });
    setMessage({ text: t('Admin.User.Saved', 'Użytkownik został zapisany.'), type: 'success' });
    await loadUsers();
  }, [loadUsers, t]);

  const userColumns: Column<AdminUser>[] = useMemo(() => [
    { key: 'login', header: t('Admin.User.Login', 'Login'), render: (val) => <strong>{val}</strong> },
    { key: 'email', header: t('Profile.Email', 'E-mail'), render: (val) => val || '-' },
    {
      key: 'firstName',
      header: t('Admin.User.Name', 'Imię i nazwisko'),
      render: (_, item) => [item.firstName, item.lastName].filter(Boolean).join(' ') || '-'
    },
    {
      key: 'languageCode',
      header: t('Profile.Language', 'Język'),
      width: '120px',
      render: (val) => LANGUAGES.find(l => l.code === val)?.name ?? val
    },
    { key: 'isActive', header: t('Admin.Active', 'Aktywny'), width: '120px', render: (val) => <ActiveBadge active={val} /> },
    {
      key: 'id',
      header: '',
      width: '100px',
      render: (_, item) => (
        <button
          onClick={() => setUserDialog({ open: true, user: item })}
          style={{
            padding: '5px 10px', cursor: 'pointer', backgroundColor: '#007bff',
            color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.9em'
          }}
        >
          {t('General.Edit', 'Edytuj')}
        </button>
      )
    }
  ], [t]);

  if (loading) return <div style={{ padding: 20 }}>{t('Common.Loading', 'Ładowanie...')}</div>;

  if (notFound) {
    return (
      <div style={{ padding: 20 }}>
        <p>{t('Admin.Client.NotFound', 'Nie znaleziono klienta.')}</p>
        <button onClick={() => navigate('/admin/clients')} style={{ padding: '6px 12px', cursor: 'pointer' }}>
          ← {t('Admin.Clients', 'Klienci')}
        </button>
      </div>
    );
  }

  return (
    <div className="details-view-container" style={{ padding: '20px' }}>
      <button
        onClick={() => navigate('/admin/clients')}
        style={{ background: 'none', border: 'none', color: '#007bff', cursor: 'pointer', padding: 0, marginBottom: 10 }}
      >
        ← {t('Admin.Clients', 'Klienci')}
      </button>

      <h2 className="section-title">
        {isNew ? t('Admin.Client.New', 'Nowy klient') : tenant?.companyName}
        {tenant?.isMaster && <MasterBadge />}
      </h2>

      {message && <AdminMessage text={message.text} type={message.type} />}

      {/* KARTA 1: DANE KLIENTA */}
      <div className="data-card">
        <h3>{t('Admin.Client.Data', 'Dane klienta')}</h3>
        <form onSubmit={handleSaveTenant} noValidate>
          <div className="form-grid-2">
            <div className="form-row">
              <label className="form-label" htmlFor="tenant-code">{t('Admin.Client.Code', 'Kod')} *</label>
              <input
                id="tenant-code"
                className="form-input"
                maxLength={10}
                disabled={!isNew}
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })}
              />
              <div style={{ marginTop: 6, fontSize: '0.85em', color: '#777' }}>
                {isNew
                  ? t('Admin.Client.CodeHint', 'Litery A-Z i cyfry, do 10 znaków. Trafia do numerów zamówień i nie można go później zmienić.')
                  : t('Admin.Client.CodeLocked', 'Kod jest częścią numerów zamówień i nie można go zmienić.')}
              </div>
            </div>
            <div className="form-row">
              <label className="form-label" htmlFor="tenant-erp-code">{t('Admin.Client.ErpCode', 'Kod ERP')}</label>
              <input
                id="tenant-erp-code"
                className="form-input"
                maxLength={50}
                value={form.erpCode}
                onChange={e => setForm({ ...form, erpCode: e.target.value })}
              />
              <div style={{ marginTop: 6, fontSize: '0.85em', color: '#777' }}>
                {t('Admin.Client.ErpCodeHint', 'Kod kontrahenta w systemie ERP. Opcjonalny, unikalny, można go zmienić.')}
              </div>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label" htmlFor="tenant-name">{t('Admin.Client.CompanyName', 'Nazwa firmy')} *</label>
            <input
              id="tenant-name"
              className="form-input"
              maxLength={255}
              value={form.companyName}
              onChange={e => setForm({ ...form, companyName: e.target.value })}
            />
          </div>

          <div className="form-row">
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: tenant?.isMaster ? 'default' : 'pointer' }}>
              <input
                type="checkbox"
                checked={form.isActive}
                disabled={tenant?.isMaster}
                onChange={e => setForm({ ...form, isActive: e.target.checked })}
              />
              {t('Admin.Client.IsActive', 'Klient aktywny (jego użytkownicy mogą się logować)')}
            </label>
          </div>

          <button type="submit" className="action-btn" disabled={saving}>
            {saving
              ? t('Common.Saving', 'Zapisywanie...')
              : isNew ? t('Admin.Client.Create', 'Dodaj klienta') : t('General.Save', 'Zapisz')}
          </button>
        </form>
      </div>

      {/* KARTA 2: UŻYTKOWNICY (dopiero po utworzeniu klienta) */}
      {!isNew && (
        <div className="data-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', borderBottom: '1px solid #eee', paddingBottom: 15, marginBottom: 20 }}>
            <h3 style={{ margin: 0, padding: 0, border: 'none' }}>
              {t('Admin.Users', 'Użytkownicy')} ({users.length})
            </h3>
            <button
              onClick={() => setUserDialog({ open: true, user: null })}
              style={{
                padding: '8px 16px', cursor: 'pointer', backgroundColor: '#2e7d32', color: 'white',
                border: 'none', borderRadius: '4px', fontWeight: 'bold'
              }}
            >
              + {t('Admin.User.Add', 'Dodaj użytkownika')}
            </button>
          </div>

          {users.length === 0
            ? <p style={{ color: '#777', margin: 0 }}>{t('Admin.User.None', 'Ten klient nie ma jeszcze użytkowników.')}</p>
            : <DataGrid data={users} columns={userColumns} />}
        </div>
      )}

      {userDialog.open && !isNew && (
        <UserFormDialog
          tenantId={id}
          user={userDialog.user}
          onClose={closeUserDialog}
          onSaved={handleUserSaved}
        />
      )}
    </div>
  );
};
