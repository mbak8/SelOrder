import { useTranslations } from '../../common/context/TranslationContext';

// Etykieta aktywny / nieaktywny (klient lub użytkownik)
export const ActiveBadge = ({ active }: { active: boolean }) => {
  const { t } = useTranslations();
  return (
    <span style={{
      fontWeight: 'bold', fontSize: '0.9em',
      color: active ? '#2e7d32' : '#d32f2f'
    }}>
      {active ? t('Admin.Active', 'Aktywny') : t('Admin.Inactive', 'Nieaktywny')}
    </span>
  );
};

// Znaczek tenanta nadrzędnego (właściciel portalu)
export const MasterBadge = () => {
  const { t } = useTranslations();
  return (
    <span style={{
      marginLeft: 8, padding: '2px 8px', borderRadius: 4, fontSize: '0.8em', fontWeight: 'bold',
      backgroundColor: '#e3f2fd', color: '#1565c0'
    }}>
      {t('Admin.Client.Master', 'Nadrzędny')}
    </span>
  );
};
