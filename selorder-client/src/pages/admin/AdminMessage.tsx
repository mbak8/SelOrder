export type AdminMessageType = 'success' | 'error';

// Komunikat sukcesu / błędu w panelu administratora.
// Zmienne --color-* nie są zdefiniowane globalnie, więc podajemy kolory zapasowe (jak w ResetPasswordPage).
export const AdminMessage = ({ text, type }: { text: string; type: AdminMessageType }) => {
  const success = type === 'success';
  return (
    <div
      role={success ? 'status' : 'alert'}
      style={{
        padding: '12px 16px', marginBottom: 20, borderRadius: 8,
        backgroundColor: success ? 'var(--color-primary-container, #e8f5e9)' : 'var(--color-error-container, #ffebee)',
        color: success ? 'var(--color-on-primary-container, #1b5e20)' : 'var(--color-on-error-container, #b71c1c)',
        border: `1px solid ${success ? 'var(--color-primary, #4ab26b)' : 'var(--color-error, #d32f2f)'}`
      }}
    >
      {text}
    </div>
  );
};
