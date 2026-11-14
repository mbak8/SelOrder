import { useEffect, useRef } from 'react';

// Okno potwierdzenia rysowane na stronie (zamiast window.confirm, które bywa blokowane,
// np. w przeglądarce wbudowanej w aplikację, i nie da się go przetłumaczyć ani ostylować)
interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;      // Czerwony przycisk potwierdzenia (operacje nieodwracalne)
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) => {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Escape zamyka okno; fokus domyślnie na bezpiecznym przycisku
  useEffect(() => {
    if (!open) return;
    cancelButtonRef.current?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      onClick={onCancel}
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
        aria-labelledby={title ? 'confirm-dialog-title' : undefined}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white', color: '#333', borderRadius: 8,
          padding: '20px 24px', width: '100%', maxWidth: 420,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
        }}
      >
        {title && <h3 id="confirm-dialog-title" style={{ margin: '0 0 10px 0' }}>{title}</h3>}
        <p style={{ margin: '0 0 20px 0', lineHeight: 1.5 }}>{message}</p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            style={{ padding: '8px 16px', cursor: 'pointer', background: 'white', color: '#333', border: '1px solid #ccc', borderRadius: 4 }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px', cursor: 'pointer', color: 'white', border: 'none', borderRadius: 4,
              background: danger ? '#d32f2f' : '#2e7d32'
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
