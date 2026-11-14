import { useEffect, useState, useMemo, useCallback, useRef, type CSSProperties } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router';
import axios from 'axios';
import { apiClient, isMasterUser } from '../api/client';
import { DataGrid, type Column } from '../common/components/DataGrid';
import { ConfirmDialog } from '../common/components/ConfirmDialog';
import { useTranslations } from '../common/context/TranslationContext';

// 1. Definicja typów (zgodna z DTO w C#)
interface OrderItem {
  orderItemId: number; // Id wiersza (0 dla pozycji dodanych, a jeszcze niezapisanych)
  articleId: number;
  articleCode: string;
  articleName: string;
  quantity: number;
  unitCode: string;
  decimalPlaces: number; // Dopuszczalna liczba miejsc po przecinku (z jednostki)
}

interface OrderDetail {
  orderId: number;
  orderNumber: string;
  orderDate: string;
  statusId: number;
  statusName: string;
  erpDocument?: string;
  isEditable: boolean; // Decyduje serwer: edycja tylko w statusie "W opracowaniu" (i nie dla tenanta nadrzędnego)
  clientCode: string;
  clientName: string;
  notes?: string | null; // Uwagi do zamówienia
  items: OrderItem[];
}

// Limit długości uwag (jak kolumna Orders.Notes i walidacja na serwerze)
const NOTES_MAX_LENGTH = 1000;

// Pozycja w trakcie edycji: ilość trzymamy jako tekst, żeby dało się wpisać np. "1,"
interface EditableItem extends OrderItem {
  quantityText: string;
}

interface ArticleOption {
  id: number;
  code: string;
  name: string;
  unitName: string;
  decimalPlaces: number;
}

interface PagedResponse<T> {
  items: T[];
}

// Zamiana tekstu z pola ilości na liczbę; null = wartość nieprawidłowa
const parseQuantity = (text: string, decimalPlaces: number): number | null => {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;

  const value = Number(normalized);
  const decimals = normalized.includes('.') ? normalized.split('.')[1].length : 0;
  if (value <= 0 || decimals > Math.min(decimalPlaces, 4)) return null;

  return value;
};

const toEditable = (items: OrderItem[]): EditableItem[] =>
  items.map(i => ({ ...i, quantityText: String(i.quantity) }));

// Odpowiedź serwera po utworzeniu zamówienia (OrderCreatedDto)
interface OrderCreated {
  id: number;
  number: string;
}

// Nowe zamówienie (adres /orders/new) istnieje tylko w przeglądarce, dopóki nie zostanie zapisane.
// Numer nadaje serwer przy pierwszym zapisie.
const newOrderDraft = (): OrderDetail => ({
  orderId: 0,
  orderNumber: '',
  orderDate: new Date().toISOString(),
  statusId: 0,
  statusName: '',
  isEditable: true,
  clientCode: '',
  clientName: '',
  items: []
});

export const OrderDetailsPage = () => {
  const { t } = useTranslations();
  const { id } = useParams(); // Pobieramy ID z adresu URL (np. "15")
  const navigate = useNavigate();
  const [isMaster] = useState(isMasterUser);

  // Tryb tworzenia nowego zamówienia (tylko zwykli klienci - tenant nadrzędny ma wyłącznie podgląd)
  const isNew = id === 'new';

  const [order, setOrder] = useState<OrderDetail | null>(() => (isNew ? newOrderDraft() : null));
  const [loading, setLoading] = useState(!isNew);

  // Stan edycji
  const [items, setItems] = useState<EditableItem[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  // isInfo: komunikat informacyjny (niebieski), np. "artykuł jest już na liście"
  const [message, setMessage] = useState<{ text: string; isError: boolean; isInfo?: boolean } | null>(null);
  const [pendingAction, setPendingAction] = useState<'approve' | 'cancel' | 'leave' | null>(null);

  // Pola ilości w tabeli (do przejścia do istniejącej pozycji) i chwilowe podświetlenie pozycji
  const quantityInputs = useRef(new Map<number, HTMLInputElement>());
  const [highlightedArticleId, setHighlightedArticleId] = useState<number | null>(null);

  // Wyszukiwarka artykułów
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ArticleOption[]>([]);
  const [searching, setSearching] = useState(false);

  // 2. Pobieranie danych
  const applyOrder = (data: OrderDetail) => {
    setOrder(data);
    setItems(toEditable(data.items));
    setNotes(data.notes ?? '');
    setIsDirty(false);
  };

  // Ponowne wczytanie po zapisie / zmianie statusu (dane zostają widoczne w trakcie)
  const reloadOrder = async () => {
    const response = await apiClient.get<OrderDetail>(`/api/orders/${id}`);
    applyOrder(response.data);
  };

  useEffect(() => {
    if (!id || id === 'new') return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get<OrderDetail>(`/api/orders/${id}`);
        setOrder(response.data);
        setItems(toEditable(response.data.items));
        setNotes(response.data.notes ?? '');
        setIsDirty(false);
      } catch (error) {
        console.error("Nie znaleziono zamówienia", error);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const isEditMode = order?.isEditable === true;

  // Ostrzeżenie przy zamykaniu/odświeżaniu karty z niezapisanymi zmianami
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  // Wyszukiwanie artykułów (debounce 300 ms)
  useEffect(() => {
    // Przy krótszej frazie lista podpowiedzi nie jest wyświetlana (patrz JSX), więc nic nie czyścimy
    const phrase = search.trim();
    if (!isEditMode || phrase.length < 2) return;

    const timerId = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await apiClient.get<PagedResponse<ArticleOption>>('/api/articles', {
          params: { search: phrase, page: 1, pageSize: 10 }
        });
        setSearchResults(response.data.items);
      } catch (err) {
        console.error("Błąd wyszukiwania artykułów", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timerId);
  }, [search, isEditMode]);

  // Błąd z serwera -> przetłumaczony komunikat (klucz Order.Error.{code})
  const errorText = useCallback((err: unknown) => {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as { code?: string; message?: string } | undefined;
      if (data?.code) return t(`Order.Error.${data.code}`, data.message);
    }
    return t('Order.Error.Generic', 'Wystąpił błąd. Spróbuj ponownie.');
  }, [t]);

  // --- Operacje na pozycjach ---
  // Przewinięcie do pola ilości i ustawienie w nim kursora z zaznaczoną wartością (do nadpisania)
  const focusQuantityInput = (input: HTMLInputElement) => {
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus({ preventScroll: true });
    input.select();
  };

  // Pozycja, na której ustawić kursor, gdy tylko pojawi się w tabeli (nowo dodany artykuł)
  const pendingFocusArticleId = useRef<number | null>(null);

  useEffect(() => {
    const articleId = pendingFocusArticleId.current;
    if (articleId === null) return;
    const input = quantityInputs.current.get(articleId);
    if (!input) return;
    pendingFocusArticleId.current = null;
    focusQuantityInput(input);
  }, [items]);

  // Artykuł już jest na liście: nie zmieniamy ilości po cichu - przechodzimy do pozycji i ją podświetlamy
  const goToExistingItem = (articleId: number) => {
    setSearch('');
    setSearchResults([]);
    setMessage({ text: t('Order.AlreadyOnList', 'Ten artykuł jest już na liście – zmień ilość w tabeli.'), isError: false, isInfo: true });
    setHighlightedArticleId(articleId);

    const input = quantityInputs.current.get(articleId);
    if (input) focusQuantityInput(input);
  };

  // Podświetlenie pozycji znika po 2 s
  useEffect(() => {
    if (highlightedArticleId === null) return;
    const timerId = setTimeout(() => setHighlightedArticleId(null), 2000);
    return () => clearTimeout(timerId);
  }, [highlightedArticleId]);

  const addArticle = (article: ArticleOption) => {
    if (items.some(i => i.articleId === article.id)) {
      goToExistingItem(article.id);
      return;
    }

    setItems(prev => {
      if (prev.some(i => i.articleId === article.id)) return prev;
      return [...prev, {
        orderItemId: 0,
        articleId: article.id,
        articleCode: article.code,
        articleName: article.name,
        quantity: 1,
        quantityText: '1',
        unitCode: article.unitName,
        decimalPlaces: article.decimalPlaces
      }];
    });
    setIsDirty(true);
    setMessage(null);
    setSearch('');
    setSearchResults([]);

    // Nowa pozycja: tak samo jak przy powtórzonym artykule - podświetlenie i kursor w polu ilości
    // (pole istnieje dopiero po odświeżeniu tabeli, więc fokus ustawia efekt na [items])
    pendingFocusArticleId.current = article.id;
    setHighlightedArticleId(article.id);
  };

  const changeQuantity = useCallback((articleId: number, text: string) => {
    setItems(prev => prev.map(i => i.articleId === articleId ? { ...i, quantityText: text } : i));
    setIsDirty(true);
    setMessage(null);
  }, []);

  const removeItem = useCallback((articleId: number) => {
    setItems(prev => prev.filter(i => i.articleId !== articleId));
    setIsDirty(true);
    setMessage(null);
  }, []);

  const hasInvalidQuantity = items.some(i => parseQuantity(i.quantityText, i.decimalPlaces) === null);
  const canSave = isEditMode && !busy && items.length > 0 && !hasInvalidQuantity;

  // --- Zapis / Zatwierdzenie / Anulowanie ---
  const itemsPayload = () => ({
    items: items.map(i => ({
      articleId: i.articleId,
      quantity: parseQuantity(i.quantityText, i.decimalPlaces)
    })),
    notes: notes.trim() || null
  });

  const changeNotes = (text: string) => {
    setNotes(text);
    setIsDirty(true);
    setMessage(null);
  };

  // Nowe zamówienie: utworzenie (serwer nadaje numer). Istniejące: zapis pozycji.
  // Zwraca id zapisanego zamówienia.
  const persistOrder = async (): Promise<OrderCreated | null> => {
    if (isNew) {
      const response = await apiClient.post<OrderCreated>('/api/orders', itemsPayload());
      return response.data;
    }
    await apiClient.put(`/api/orders/${id}/items`, itemsPayload());
    return null;
  };

  // Po utworzeniu przechodzimy pod adres zapisanego zamówienia (bez wpisu w historii dla /orders/new)
  const openCreatedOrder = (created: OrderCreated) => {
    setIsDirty(false);
    setMessage({ text: `${t('Order.Created', 'Utworzono zamówienie')} ${created.number}`, isError: false });
    navigate(`/orders/${created.id}`, { replace: true });
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const created = await persistOrder();
      if (created) {
        openCreatedOrder(created);
        return;
      }
      await reloadOrder();
      setMessage({ text: t('Order.Saved', 'Zapisano zmiany.'), isError: false });
    } catch (err) {
      setMessage({ text: errorText(err), isError: true });
    } finally {
      setBusy(false);
    }
  };

  // Wykonywane dopiero po potwierdzeniu w oknie ConfirmDialog
  const approveOrder = async () => {
    setBusy(true);
    let created: OrderCreated | null = null;
    try {
      // Niezapisane zmiany (lub nowe zamówienie) zapisujemy przed zatwierdzeniem
      created = (isNew || isDirty) ? await persistOrder() : null;
      const orderId = created ? created.id : id;
      await apiClient.post(`/api/orders/${orderId}/approve`);
      if (created) {
        openCreatedOrder(created);
        return;
      }
      await reloadOrder();
      setMessage(null);
    } catch (err) {
      // Zamówienie utworzone, ale zatwierdzenie się nie udało -> i tak przechodzimy do zapisanego zamówienia,
      // żeby ponowny zapis nie utworzył duplikatu
      if (created) openCreatedOrder(created);
      setMessage({ text: errorText(err), isError: true });
    } finally {
      setBusy(false);
    }
  };

  const cancelOrder = async () => {
    setBusy(true);
    try {
      await apiClient.post(`/api/orders/${id}/cancel`);
      await reloadOrder();
      setMessage(null);
    } catch (err) {
      setMessage({ text: errorText(err), isError: true });
    } finally {
      setBusy(false);
    }
  };

  const handleBack = () => {
    if (isDirty) {
      setPendingAction('leave');
      return;
    }
    navigate('/orders');
  };

  // Akcja czekająca na potwierdzenie w oknie dialogowym
  const closeDialog = useCallback(() => setPendingAction(null), []);

  const confirmPendingAction = () => {
    const action = pendingAction;
    setPendingAction(null);
    if (action === 'approve') approveOrder();
    else if (action === 'cancel') cancelOrder();
    else if (action === 'leave') navigate('/orders');
  };

  const dialogConfig = {
    approve: {
      title: t('Order.Approve', 'Zatwierdź zamówienie'),
      message: t('Order.ConfirmApprove', 'Zatwierdzić zamówienie? Po zatwierdzeniu nie będzie można go edytować.'),
      confirmLabel: t('Order.Approve', 'Zatwierdź zamówienie'),
      danger: false
    },
    cancel: {
      title: t('Order.Cancel', 'Anuluj zamówienie'),
      message: t('Order.ConfirmCancel', 'Anulować zamówienie? Tej operacji nie można cofnąć.'),
      confirmLabel: t('Order.Cancel', 'Anuluj zamówienie'),
      danger: true
    },
    leave: {
      title: undefined,
      message: t('Order.UnsavedChanges', 'Masz niezapisane zmiany. Opuścić stronę?'),
      confirmLabel: t('Order.LeavePage', 'Opuść stronę'),
      danger: true
    }
  };
  const dialog = pendingAction ? dialogConfig[pendingAction] : null;

  // 3. Kolumny dla tabeli pozycji
  const columns: Column<EditableItem>[] = useMemo(() => {
    const cols: Column<EditableItem>[] = [
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
        key: 'quantityText',
        header: t('Order.Quantity'),
        width: '120px',
        render: (_, item) => {
          if (!isEditMode) {
            return item.quantity.toFixed(item.decimalPlaces);
          }
          const invalid = parseQuantity(item.quantityText, item.decimalPlaces) === null;
          const highlighted = item.articleId === highlightedArticleId;
          return (
            <input
              type="text"
              inputMode="decimal"
              value={item.quantityText}
              ref={(el) => {
                if (el) quantityInputs.current.set(item.articleId, el);
                else quantityInputs.current.delete(item.articleId);
              }}
              onChange={(e) => changeQuantity(item.articleId, e.target.value)}
              style={{
                width: '90px',
                padding: '4px 6px',
                textAlign: 'right',
                border: `1px solid ${invalid ? '#d32f2f' : highlighted ? '#1565c0' : '#ccc'}`,
                backgroundColor: invalid ? '#ffebee' : highlighted ? '#fff59d' : 'white',
                boxShadow: highlighted ? '0 0 0 3px rgba(21, 101, 192, 0.3)' : 'none',
                transition: 'background-color 0.4s, box-shadow 0.4s',
                color: '#333', // globalny styl inputów ma biały tekst
                borderRadius: '4px'
              }}
            />
          );
        }
      },
      {
        key: 'unitCode',
        header: t('Order.Unit'),
        width: '80px'
      }
    ];

    if (isEditMode) {
      cols.push({
        key: 'orderItemId',
        header: '',
        width: '90px',
        render: (_, item) => (
          <button
            onClick={() => removeItem(item.articleId)}
            style={{ padding: '4px 8px', cursor: 'pointer', color: '#d32f2f', background: 'white', border: '1px solid #d32f2f', borderRadius: '4px' }}
          >
            {t('General.Remove', 'Usuń')}
          </button>
        )
      });
    }

    return cols;
  }, [t, isEditMode, changeQuantity, removeItem, highlightedArticleId]);

  // Helper do daty (ten sam co wcześniej)
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const statusColor = (statusId: number) => {
    switch (statusId) {
      case 3: return '#999';     // Anulowane
      case 5: return 'green';    // Zatwierdzone
      case 15: return 'red';     // Błąd eksportu
      default: return '#333';
    }
  };

  // Tenant nadrzędny nie tworzy zamówień (serwer i tak odrzuci zapis) - wracamy do listy
  if (isNew && isMaster) return <Navigate to="/orders" replace />;

  if (loading && !order) return <div style={{ padding: 20 }}>{t('Order.Loading', 'Ładowanie zamówienia...')}</div>;
  if (!order) return <div style={{ padding: 20 }}>{t('Order.NotFound', 'Nie znaleziono zamówienia.')}</div>;

  const buttonStyle = (bg: string, enabled: boolean): CSSProperties => ({
    padding: '8px 18px',
    cursor: enabled ? 'pointer' : 'not-allowed',
    backgroundColor: enabled ? bg : '#ccc',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.95em'
  });

  return (
    <div style={{ padding: '20px' }}>
      {/* Przycisk Powrotu */}
      <button
        onClick={handleBack}
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
            <h2 style={{ margin: '0 0 10px 0' }}>{isNew ? t('Order.New', 'Nowe zamówienie') : order.orderNumber}</h2>
            {/* Tenant nadrzędny przegląda zamówienia różnych klientów - pokazujemy czyje to zamówienie */}
            {isMaster && (
                <div style={{ color: '#666', marginBottom: 5 }}>
                    {t('Order.Client', 'Klient')}: <strong>{order.clientName}</strong> ({order.clientCode})
                </div>
            )}
            <div style={{ color: '#666' }}>
                {t('Order.Date', 'Data')}: <strong>{formatDate(order.orderDate)}</strong>
            </div>
            {order.erpDocument && (
                <div style={{ color: '#666', marginTop: 5 }}>
                    {t('Order.ERPDocument', 'Dokument ERP')}: <strong>{order.erpDocument}</strong>
                </div>
            )}
        </div>

        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9em', color: '#888', marginBottom: 5 }}>{t('Order.Status', 'Status')}</div>
            <div style={{
                fontSize: '1.2em',
                fontWeight: 'bold',
                color: statusColor(order.statusId)
            }}>
                {isNew ? t('Order.NotSaved', 'Niezapisane') : order.statusName}
            </div>
        </div>
      </div>

      {/* TABELA POZYCJI */}
      <h3>{t('Order.Items', 'Pozycje')} ({items.length})</h3>

      {/* Dodawanie artykułu (tylko w trybie edycji) */}
      {isEditMode && (
        <div style={{ position: 'relative', marginBottom: 15, maxWidth: 500 }}>
          <label style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
            {t('Order.AddArticle', 'Dodaj artykuł')}
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Order.SearchArticle', 'Szukaj po kodzie lub nazwie...')}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', boxSizing: 'border-box' }}
          />
          {search.trim().length >= 2 && (
            <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'white', border: '1px solid #ccc', borderRadius: '4px',
                maxHeight: 300, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {searching && searchResults.length === 0 && (
                <div style={{ padding: 8, color: '#888' }}>{t('Grid.Loading', 'Ładowanie...')}</div>
              )}
              {!searching && searchResults.length === 0 && (
                <div style={{ padding: 8, color: '#888' }}>{t('Order.NoResults', 'Brak wyników')}</div>
              )}
              {searchResults.map(a => {
                // Artykuł już dodany - pokazujemy to przed kliknięciem (kliknięcie przeniesie do pozycji)
                const onList = items.find(i => i.articleId === a.id);
                return (
                  <div
                    key={a.id}
                    onClick={() => addArticle(a)}
                    style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f6ff')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                  >
                    <strong>{a.code}</strong> – {a.name} <span style={{ color: '#888' }}>({a.unitName})</span>
                    {onList && (
                      <span style={{
                          marginLeft: 8, padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap',
                          fontSize: '0.85em', color: '#2e7d32', backgroundColor: '#e8f5e9'
                      }}>
                        ✓ {t('Order.OnList', 'na liście')}: {onList.quantityText} {onList.unitCode}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <DataGrid
        data={items}
        columns={columns}

        // Wyłączamy stronicowanie i filtry - tu chcemy prostą listę
        isPagination={false}
        isFiltering={false}
      />

      {isEditMode && items.length === 0 && (
        <div style={{ marginTop: 10, color: '#d32f2f' }}>
          {t('Order.NoItems', 'Brak pozycji. Dodaj artykuł, aby zapisać zamówienie.')}
        </div>
      )}

      {/* UWAGI - edycja w statusie "W opracowaniu", w pozostałych tylko podgląd */}
      <div style={{ marginTop: 25, maxWidth: 800 }}>
        <label htmlFor="order-notes" style={{ display: 'block', marginBottom: 5, fontWeight: 'bold' }}>
          {t('Order.Notes', 'Uwagi')}
        </label>
        {isEditMode ? (
          <>
            <textarea
              id="order-notes"
              value={notes}
              onChange={(e) => changeNotes(e.target.value)}
              maxLength={NOTES_MAX_LENGTH}
              rows={4}
              placeholder={t('Order.NotesPlaceholder', 'Uwagi do zamówienia...')}
              style={{
                width: '100%', padding: '8px', boxSizing: 'border-box', resize: 'vertical',
                border: '1px solid #ccc', borderRadius: '4px', fontFamily: 'inherit', fontSize: '0.95em',
                backgroundColor: 'white', color: '#333' // globalny styl pól ma biały tekst
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '0.8em', color: notes.length >= NOTES_MAX_LENGTH ? '#d32f2f' : '#888' }}>
              {notes.length} / {NOTES_MAX_LENGTH}
            </div>
          </>
        ) : (
          <div style={{
              padding: '10px', background: '#f9f9f9', border: '1px solid #eee', borderRadius: '4px',
              whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: order.notes ? '#333' : '#888'
          }}>
            {order.notes || t('Order.NoNotes', 'Brak uwag')}
          </div>
        )}
      </div>

      {/* Komunikat po operacji */}
      {message && (
        <div style={{
            marginTop: 15, padding: '10px 15px', borderRadius: '4px',
            color: message.isError ? '#d32f2f' : message.isInfo ? '#1565c0' : '#2e7d32',
            backgroundColor: message.isError ? '#ffebee' : message.isInfo ? '#e3f2fd' : '#e8f5e9'
        }}>
          {message.text}
        </div>
      )}

      {/* PRZYCISKI AKCJI (tylko w trybie edycji) */}
      {isEditMode && (
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={handleSave} disabled={!canSave || !isDirty} style={buttonStyle('#007bff', canSave && isDirty)}>
            {t('General.Save', 'Zapisz')}
          </button>
          <button onClick={() => setPendingAction('approve')} disabled={!canSave} style={buttonStyle('#2e7d32', canSave)}>
            {t('Order.Approve', 'Zatwierdź zamówienie')}
          </button>
          <div style={{ flex: 1 }} />
          {/* Niezapisanego zamówienia nie ma czego anulować - wystarczy z niego wyjść */}
          {!isNew && (
            <button onClick={() => setPendingAction('cancel')} disabled={busy} style={buttonStyle('#d32f2f', !busy)}>
              {t('Order.Cancel', 'Anuluj zamówienie')}
            </button>
          )}
        </div>
      )}

      {/* Potwierdzenie zatwierdzenia / anulowania / wyjścia bez zapisu */}
      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.title}
        message={dialog?.message ?? ''}
        confirmLabel={dialog?.confirmLabel ?? ''}
        cancelLabel={t('General.Back', 'Wróć')}
        danger={dialog?.danger}
        onConfirm={confirmPendingAction}
        onCancel={closeDialog}
      />
    </div>
  );
};
