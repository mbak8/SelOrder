import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { DataGrid, type Column } from '../components/common/DataGrid';
import { useTranslations } from '../context/TranslationContext';

// 1. Definicja typów (zgodna z Twoim DTO w C#)
interface OrderItem {
  orderItemId: number; // Id wiersza
  articleId: number;
  articleCode: string;
  articleName: string;
  quantity: number;
  unitCode: string;
}

interface OrderDetail {
  orderId: number;
  orderNumber: string;
  orderDate: string;
  statusId: number;
  statusName: string;
  erpDocument?: string;
  items: OrderItem[]; // <--- Lista pozycji
}

export const OrderDetailsPage = () => {
  const { t } = useTranslations();
  const { id } = useParams(); // Pobieramy ID z adresu URL (np. "15")
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // 2. Pobieranie danych
  useEffect(() => {
    if (!id) return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<OrderDetail>(`/api/orders/${id}`);
        setOrder(response.data);
      } catch (error) {
        console.error("Nie znaleziono zamówienia", error);
        // Opcjonalnie: przekieruj na listę jeśli błąd 404
        // navigate('/orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  // 3. Kolumny dla tabeli pozycji
  const columns: Column<OrderItem>[] = useMemo(() => [
    { 
      key: 'articleCode', 
      header: t('Article.Code'), 
      width: '120px',
      render: (val) => <strong>{val}</strong>
    },
    { 
      key: 'articleName', 
      header: t('Article.Name') 
    },
    { 
      key: 'quantity', 
      header: t('Order.Quantity'), 
      width: '100px',
      // Formatowanie liczb (np. 10.50)
      render: (val) => val.toFixed(2) 
    },
    { 
      key: 'unitCode', 
      header: t('Order.Unit'), 
      width: '80px' 
    }
  ], [t]);

  // Helper do daty (ten sam co wcześniej)
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  if (loading) return <div style={{ padding: 20 }}>Ładowanie zamówienia...</div>;
  if (!order) return <div style={{ padding: 20 }}>Nie znaleziono zamówienia.</div>;

  return (
    <div style={{ padding: '20px' }}>
      {/* Przycisk Powrotu */}
      <button 
        onClick={() => navigate('/orders')}
        style={{ marginBottom: 20, padding: '5px 15px', cursor: 'pointer' }}
      >
        &larr; {t('Menu.Orders')}
      </button>

      {/* NAGŁÓWEK ZAMÓWIENIA (Karta informacyjna) */}
      <div style={{ 
          background: '#f9f9f9', 
          padding: '20px', 
          borderRadius: '8px', 
          marginBottom: '30px',
          border: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
      }}>
        <div>
            <h2 style={{ margin: '0 0 10px 0' }}>{order.orderNumber}</h2>
            <div style={{ color: '#666' }}>
                Data: <strong>{formatDate(order.orderDate)}</strong>
            </div>
            {order.erpDocument && (
                <div style={{ color: '#666', marginTop: 5 }}>
                    Dokument ERP: <strong>{order.erpDocument}</strong>
                </div>
            )}
        </div>

        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9em', color: '#888', marginBottom: 5 }}>Status</div>
            <div style={{ 
                fontSize: '1.2em', 
                fontWeight: 'bold',
                color: order.statusId === 5 ? 'green' : (order.statusId === 15 ? 'red' : '#333')
            }}>
                {order.statusName}
            </div>
        </div>
      </div>

      {/* TABELA POZYCJI */}
      <h3>Pozycje ({order.items.length})</h3>
      <DataGrid 
        data={order.items} 
        columns={columns}
        
        // Wyłączamy stronicowanie i filtry - tu chcemy prostą listę
        isPagination={false}
        isFiltering={false}
      />
    </div>
  );
};