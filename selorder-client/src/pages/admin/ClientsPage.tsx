import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { adminApi, type Tenant } from '../../api/adminApi';
import { DataGrid, type Column } from '../../common/components/DataGrid';
import { useTranslations } from '../../common/context/TranslationContext';
import { ActiveBadge, MasterBadge } from './AdminBadges';

// Panel administratora: lista klientów (tenantów). Dostępna tylko dla tenanta nadrzędnego.
export const ClientsPage = () => {
  const { t } = useTranslations();
  const navigate = useNavigate();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchTenants = async () => {
      setLoading(true);
      try {
        const data = await adminApi.getTenants({ page, pageSize, ...filters });
        setTenants(data.items);
        setTotalItems(data.totalItems);
      } catch (err) {
        console.error('Błąd pobierania klientów', err);
      } finally {
        setLoading(false);
      }
    };

    // Debounce 500ms (filtry wpisywane z klawiatury)
    const timerId = setTimeout(fetchTenants, 500);
    return () => clearTimeout(timerId);
  }, [page, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // Klucze kolumn z filtrem ("code", "erpCode", "companyName") = nazwy pól filtrowanych na serwerze
  const columns: Column<Tenant>[] = useMemo(() => [
    {
      key: 'code',
      header: t('Admin.Client.Code', 'Kod'),
      width: '140px',
      render: (val) => <strong>{val}</strong>
    },
    {
      key: 'erpCode',
      header: t('Admin.Client.ErpCode', 'Kod ERP'),
      width: '160px',
      render: (val) => val || '-'
    },
    {
      key: 'companyName',
      header: t('Admin.Client.CompanyName', 'Nazwa firmy'),
      render: (_, item) => (
        <span>
          {item.companyName}
          {item.isMaster && <MasterBadge />}
        </span>
      )
    },
    {
      key: 'isActive',
      header: t('Admin.Active', 'Aktywny'),
      width: '120px',
      filterable: false,
      render: (val) => <ActiveBadge active={val} />
    },
    {
      key: 'userCount',
      header: t('Admin.Client.UserCount', 'Użytkownicy'),
      width: '120px',
      filterable: false
    },
    {
      key: 'id',
      header: '',
      width: '120px',
      filterable: false,
      render: (_, item) => (
        <button
          onClick={() => navigate(`/admin/clients/${item.id}`)}
          style={{
            padding: '5px 10px', cursor: 'pointer', backgroundColor: '#007bff',
            color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.9em'
          }}
        >
          {t('Admin.Manage', 'Zarządzaj')}
        </button>
      )
    }
  ], [t, navigate]);

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 15, flexWrap: 'wrap' }}>
        <h2>🛠️ {t('Admin.Clients', 'Klienci')} ({totalItems})</h2>

        <button
          onClick={() => navigate('/admin/clients/new')}
          style={{
            padding: '8px 18px', cursor: 'pointer', backgroundColor: '#2e7d32', color: 'white',
            border: 'none', borderRadius: '4px', fontSize: '0.95em', fontWeight: 'bold'
          }}
        >
          + {t('Admin.Client.New', 'Nowy klient')}
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <DataGrid
          data={tenants}
          columns={columns}
          isLoading={loading}
          isPagination
          isFiltering
          totalItems={totalItems}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </div>
    </div>
  );
};
