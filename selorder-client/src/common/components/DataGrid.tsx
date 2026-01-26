import type { ReactNode } from 'react';
import { useTranslations } from  '../context/TranslationContext';
import './DataGrid.css';

export interface Column<T> {
  key: keyof T;
  header: string;
  width?: string;
  render?: (value: any, item: T) => ReactNode;
}

interface DataGridProps<T> {
  data: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  
  // Przełączniki funkcji
  isFiltering?: boolean; // NOWOŚĆ
  isPagination?: boolean; // NOWOŚĆ

  // Filtry
  filters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;

  // Stronicowanie
  totalItems?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (newPage: number) => void;
}

export const DataGrid = <T extends { id: number | string }>({ 
  data, 
  columns, 
  isLoading, 
  isFiltering = false, // Domyślnie wyłączone
  isPagination = false, // Domyślnie wyłączone
  filters, 
  onFilterChange,
  totalItems,
  page = 1,
  pageSize = 20,
  onPageChange
}: DataGridProps<T>) => {
  const { t } = useTranslations();

  // NOWOŚĆ: Jeśli paginacja jest wyłączona, traktujemy pageSize jako 0 (brak limitu)
  const effectivePageSize = isPagination ? pageSize : 0;

  const showPagination = isPagination && totalItems !== undefined && onPageChange !== undefined;
  
  // Zabezpieczenie przed dzieleniem przez 0
  const totalPages = showPagination && effectivePageSize > 0 
    ? Math.ceil((totalItems || 0) / effectivePageSize) 
    : 1;

  // Logika filtrów: musi być włączona przełącznikiem ORAZ posiadać funkcję obsługi
  const showFiltering = isFiltering && onFilterChange !== undefined;

  if (isLoading) {
    return <div className="datagrid-loading">{t('Grid.Loading')}</div>;
  }

  return (
    <div className="datagrid-wrapper">
      <div className="datagrid-container">
        <table className="datagrid-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={String(col.key)} style={{ width: col.width }}>{col.header}</th>
              ))}
            </tr>
            {/* Warunkowe renderowanie wiersza filtrów */}
            {showFiltering && (
              <tr className="filter-row">
                {columns.map((col) => (
                   <th key={`filter-${String(col.key)}`}>
                      <input
                        className="datagrid-filter-input"
                        placeholder={`${t('Grid.Search')}...`}
                        value={filters?.[String(col.key)] || ''}
                        onChange={(e) => onFilterChange!(String(col.key), e.target.value)}
                      />
                   </th>
                ))}
              </tr>
            )}
          </thead>
          <tbody>
            {data.map((item, index) => (
                <tr key={index}>
                  {columns.map((col) => (
                    <td 
                      key={col.key as string}
                      /* --- TO JEST NOWOŚĆ: --- */
                      data-label={col.header} 
                    >
                      {col.render ? col.render(item[col.key], item) : (item[col.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Warunkowe renderowanie paska nawigacji */}
      {showPagination && (
        <div className="datagrid-footer" style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: '#f9f9f9', borderTop: '1px solid #eee' }}>
            <span>
                {t('Grid.Records')}: <strong>{totalItems}</strong> | {t('Grid.Page')} <strong>{page}</strong> {t('Grid.Of')} {totalPages}
            </span>
            <div style={{ display: 'flex', gap: 5 }}>
                <button 
                    disabled={page === 1} 
                    onClick={() => onPageChange!(page - 1)}
                    style={{ cursor: 'pointer', padding: '5px 10px' }}>
                    {t('Grid.Previous')}
                </button>
                <button 
                    disabled={page >= totalPages} 
                    onClick={() => onPageChange!(page + 1)}
                    style={{ cursor: 'pointer', padding: '5px 10px' }}>
                    {t('Grid.Next')}
                </button>
            </div>
        </div>
      )}
    </div>
  );
};