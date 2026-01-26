import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../common/api/client';
import { DataGrid, type Column } from '../common/components/DataGrid';
import { useTranslations } from  '../common/context/TranslationContext';

// 1. Interfejs zgodny z C# OrderDto
interface Order {
  id: number;
  number: string;
  date: string;       // JSON przesyła daty jako string
  statusId: number;   // Potrzebne do kolorowania (0, 5, 10...)
  statusName: string; // Przetłumaczona nazwa (np. "W opracowaniu")
  erpDocument?: string;
  statusDescription?: string;
}

// Interfejs odpowiedzi stronicowanej
interface PagedResponse<T> {
  items: T[];
  totalItems: number;
  pageSize: number;
  pageNumber: number;
  totalPages: number;
}

export const OrdersPage = () => {
  const { t } = useTranslations();

  const navigate = useNavigate();
  
  // Konfiguracja
  const IS_PAGINATION_ENABLED = true; // Tu chcemy stronicowanie, bo zamówień będzie dużo
  const IS_FILTERING_ENABLED = true;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stany Grida
  const [page, setPage] = useState(1);
  const [pageSize] = useState(IS_PAGINATION_ENABLED ? 20 : -1);
  const [totalItems, setTotalItems] = useState(0);
  const [filters, setFilters] = useState<Record<string, string>>({});

  // 2. Pobieranie danych
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const params = {
            page,
            pageSize,
            ...filters 
        };

        const response = await apiClient.get<PagedResponse<Order>>('/api/orders', { params });
        
        setOrders(response.data.items);
        setTotalItems(response.data.totalItems);
      } catch (err) {
        console.error("Błąd pobierania zamówień", err);
      } finally {
        setLoading(false);
      }
    };

    // Debounce 500ms
    const timerId = setTimeout(() => {
      fetchOrders();
    }, 500);

    return () => clearTimeout(timerId);
  }, [page, pageSize, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  // 3. Definicja Kolumn
  const columns: Column<Order>[] = useMemo(() => [
    { 
      key: 'number', 
      header: t('Order.Number'),
      width: '180px',
      render: (val) => <strong>{val}</strong>
    },
    { 
      key: 'date', 
      header: t('Order.Date'), // lub "Data"
      width: '150px',
      render: (val) => {
        if (!val) return '-';
        
        const d = new Date(val);
        
        // 1. Wyciągamy dzień i dodajemy zero wiodące (np. "5" -> "05")
        const day = String(d.getDate()).padStart(2, '0');
        
        // 2. Wyciągamy miesiąc (JS liczy od 0!) i dodajemy zero
        const month = String(d.getMonth() + 1).padStart(2, '0'); 
        
        // 3. Rok
        const year = d.getFullYear();

        // 4. Składamy to "na sztywno" z KROPKAMI. 
        // Przeglądarka nie ma tu nic do gadania.
        return `${day}.${month}.${year}`;
      }
    },
    { 
      key: 'statusName', // Wyświetlamy nazwę, ale logikę opieramy na statusId
      header: t('Order.Status'),
      render: (_, item) => {
        // Logika kolorów
        let color = '#333';
        let bg = 'transparent';
        
        switch (item.statusId) {
            case 0:  color = '#666'; break;       // W opracowaniu (Szary)
            case 5:  color = '#2e7d32'; break;    // Zatwierdzone (Zielony)
            case 10: color = '#1565c0'; break;    // Wysłane (Niebieski)
            case 15: color = '#d32f2f'; bg = '#ffebee'; break; // Błąd (Czerwony na tle)
        }

        return (
          <span style={{ 
              color, 
              backgroundColor: bg,
              padding: bg !== 'transparent' ? '4px 8px' : 0,
              borderRadius: '4px',
              fontWeight: 'bold',
              fontSize: '0.9em'
          }}>
            {item.statusName}
          </span>
        );
      }
    },
    { 
      key: 'erpDocument', 
      header: t('Order.ERPDocument'),
      render: (val) => val || '-' // Jeśli null, wyświetl myślnik
    },
    {
      key: 'id', // Używamy 'id' jako klucza technicznego
      header: '', // Pusty nagłówek
      width: '100px',
      filterable: false, // Wyłączamy filtr nad przyciskiem!
      render: (_, item) => (
        <button 
          onClick={() => navigate(`/orders/${item.id}`)}
          style={{
            padding: '5px 10px',
            cursor: 'pointer',
            backgroundColor: '#007bff', // Niebieski
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.9em'
          }}
        >
          {t('General.Edit') || 'Edytuj'} 
        </button>
      )
    }    
  ], [t, navigate]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>📄 {t('Menu.Orders')} ({totalItems})</h2>
      
      <div style={{ marginTop: 20 }}>
        <DataGrid 
          data={orders} 
          columns={columns}
          isLoading={loading}
          
          isPagination={IS_PAGINATION_ENABLED}
          isFiltering={IS_FILTERING_ENABLED}
          
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