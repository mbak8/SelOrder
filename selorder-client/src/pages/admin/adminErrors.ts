import { isAxiosError } from 'axios';

type TranslateFn = (key: string, fallback?: string) => string;

// Błąd z serwera -> przetłumaczony komunikat (klucz Admin.Error.{code}, zapasowo polski tekst z serwera)
export const adminErrorText = (err: unknown, t: TranslateFn): string => {
  if (isAxiosError(err)) {
    const data = err.response?.data as { code?: string; message?: string } | undefined;
    if (data?.code) return t(`Admin.Error.${data.code}`, data.message);

    if (err.response?.status === 404) return t('Admin.Error.NotFound', 'Nie znaleziono rekordu.');
    if (err.response?.status === 403) return t('Admin.Error.Forbidden', 'Brak uprawnień do panelu administratora.');
  }
  return t('Admin.Error.Generic', 'Wystąpił błąd. Spróbuj ponownie.');
};
