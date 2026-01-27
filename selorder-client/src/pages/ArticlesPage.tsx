import { useEffect, useState, useMemo } from 'react';
import { apiClient } from '../api/client';
import { DataGrid, type Column } from '../common/components/DataGrid';
import { useTranslations } from  '../common/context/TranslationContext';

// Struktura odpowiedzi z backendu
interface PagedResponse<T> {
  items: T[];
  totalItems: number;
  pageSize: number;
  pageNumber: number;
  totalPages: number;
}

interface Article {
  id: number;
  code: string;
  name: string;
  erpId?: number;
  quantityAvailable: number;
  quantityReserved: number;
  unitCode: string;
  unitName: string;
  decimalPlaces: number;
}

export const ArticlesPage = () => {
  const IS_PAGINATION_ENABLED = true;
  const IS_FILTERING_ENABLED = true;


  const { t } = useTranslations();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stan stronicowania
  const [page, setPage] = useState(1);
  const [pageSize] = useState(IS_PAGINATION_ENABLED ? 20 : -1);
  const [totalItems, setTotalItems] = useState(0);

  // Stan filtrów (Klucz = nazwa kolumny, Wartość = wpisany tekst)
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // --- TU JEST MAGIA UNIWERSALNOŚCI ---
        // Tworzymy obiekt parametrów: page + pageSize + wszystkie aktywne filtry
        const params = {
            page,
            pageSize,
            ...filters // Rozpakowujemy filtry (np. code: 'abc', name: 'xyz') wprost do URL
        };

        const response = await apiClient.get<PagedResponse<Article>>('/api/articles', { params });
        
        setArticles(response.data.items);
        setTotalItems(response.data.totalItems);
      } catch (err) {
        console.error("Błąd pobierania danych", err);
      } finally {
        setLoading(false);
      }
    };

    // Debounce: Czekamy 500ms od ostatniego kliknięcia/pisania
    const timerId = setTimeout(() => {
      fetchData();
    }, 500);

    return () => clearTimeout(timerId);
  }, [page, pageSize, filters]); // Reagujemy na każdą zmianę

  // Obsługa wpisywania w inputy nad kolumnami
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Zawsze wracamy na 1. stronę po zmianie filtra
  };

  const columns: Column<Article>[] = useMemo(() => [
    { 
      key: 'code', 
      header: t('Article.Index'), 
      width: '150px', 
      render: (val) => <strong>{val}</strong> 
    },
    { 
      key: 'name', 
      header: t('Article.Name')
    },
    { 
      key: 'quantityAvailable', 
      header: t('Article.AvailableQty'), 
      width: '150px',
      render: (_, item) => (
          <span style={{ fontWeight: 'bold', color: item.quantityAvailable > 0 ? 'green' : 'red' }}>
            {item.quantityAvailable.toFixed(item.decimalPlaces)} {item.unitName}
          </span>
      )
    }
  ], [t]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>📦 {t('Articles')} ({totalItems})</h2>
      
      <div style={{ marginTop: 20 }}>
        <DataGrid 
          data={articles} 
          columns={columns}
          isLoading={loading}

          isPagination={IS_PAGINATION_ENABLED}   // Włącza pasek na dole
          isFiltering={IS_FILTERING_ENABLED}    // Włącza inputy w nagłówku
          
          // Parametry stronicowania (dla paska na dole) - zakomentować to wyłączymy stronicowanie
          totalItems={totalItems}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          
          // Parametry filtrowania - zakomentować to wyłączymy filtry
          filters={filters}
          onFilterChange={handleFilterChange}
        />
      </div>
    </div>
  );
};