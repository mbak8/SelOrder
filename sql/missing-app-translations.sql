-- Brakujące tłumaczenia interfejsu (AppTranslations) używane przez selorder-client.
-- Strony: reset hasła (Auth.Forgot.*, Auth.Reset.*), profil (Profile.*), szczegóły zamówienia (Article.Code), Common.*
-- Skrypt jest idempotentny: wstawia tylko brakujące wiersze, istniejących tłumaczeń nie nadpisuje.
-- Po uruchomieniu zrestartuj selorder-server (słownik jest trzymany w HybridCache pod kluczem app-dict-{lang}).

USE [SelOrder];
GO

SET NOCOUNT ON;

DECLARE @t TABLE (TranslationKey nvarchar(100) NOT NULL, LanguageCode char(2) NOT NULL, TranslatedText nvarchar(max) NOT NULL);

INSERT INTO @t (TranslationKey, LanguageCode, TranslatedText) VALUES
-- Common
(N'Common.Loading',              'PL', N'Ładowanie...'),
(N'Common.Loading',              'EN', N'Loading...'),
(N'Common.Loading',              'DE', N'Wird geladen...'),
(N'Common.Loading',              'RU', N'Загрузка...'),
(N'Common.LanguageLabel',        'PL', N'Język'),
(N'Common.LanguageLabel',        'EN', N'Language'),
(N'Common.LanguageLabel',        'DE', N'Sprache'),
(N'Common.LanguageLabel',        'RU', N'Язык'),

-- Article
(N'Article.Code',                'PL', N'Kod'),
(N'Article.Code',                'EN', N'Code'),
(N'Article.Code',                'DE', N'Code'),
(N'Article.Code',                'RU', N'Код'),

-- Auth.Forgot (zapomniane hasło)
(N'Auth.Forgot.Title',           'PL', N'Nie pamiętasz hasła?'),
(N'Auth.Forgot.Title',           'EN', N'Forgot your password?'),
(N'Auth.Forgot.Title',           'DE', N'Passwort vergessen?'),
(N'Auth.Forgot.Title',           'RU', N'Забыли пароль?'),
(N'Auth.Forgot.EmailLabel',      'PL', N'Adres e-mail'),
(N'Auth.Forgot.EmailLabel',      'EN', N'E-mail address'),
(N'Auth.Forgot.EmailLabel',      'DE', N'E-Mail-Adresse'),
(N'Auth.Forgot.EmailLabel',      'RU', N'Адрес электронной почты'),
(N'Auth.Forgot.Submit',          'PL', N'Wyślij link resetujący'),
(N'Auth.Forgot.Submit',          'EN', N'Send reset link'),
(N'Auth.Forgot.Submit',          'DE', N'Link zum Zurücksetzen senden'),
(N'Auth.Forgot.Submit',          'RU', N'Отправить ссылку для сброса'),
(N'Auth.Forgot.SuccessMessage',  'PL', N'Jeśli konto z tym adresem istnieje, wysłaliśmy instrukcję resetu hasła.'),
(N'Auth.Forgot.SuccessMessage',  'EN', N'If an account with this address exists, we have sent password reset instructions.'),
(N'Auth.Forgot.SuccessMessage',  'DE', N'Falls ein Konto mit dieser Adresse existiert, haben wir eine Anleitung zum Zurücksetzen gesendet.'),
(N'Auth.Forgot.SuccessMessage',  'RU', N'Если учётная запись с этим адресом существует, мы отправили инструкции по сбросу пароля.'),
(N'Auth.Forgot.ErrorMessage',    'PL', N'Wystąpił błąd. Spróbuj ponownie później.'),
(N'Auth.Forgot.ErrorMessage',    'EN', N'An error occurred. Please try again later.'),
(N'Auth.Forgot.ErrorMessage',    'DE', N'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.'),
(N'Auth.Forgot.ErrorMessage',    'RU', N'Произошла ошибка. Повторите попытку позже.'),
(N'Auth.Forgot.BackToLogin',     'PL', N'Wróć do logowania'),
(N'Auth.Forgot.BackToLogin',     'EN', N'Back to sign in'),
(N'Auth.Forgot.BackToLogin',     'DE', N'Zurück zur Anmeldung'),
(N'Auth.Forgot.BackToLogin',     'RU', N'Вернуться ко входу'),

-- Auth.Reset (ustawienie nowego hasła)
(N'Auth.Reset.Title',            'PL', N'Ustaw nowe hasło'),
(N'Auth.Reset.Title',            'EN', N'Set a new password'),
(N'Auth.Reset.Title',            'DE', N'Neues Passwort festlegen'),
(N'Auth.Reset.Title',            'RU', N'Установите новый пароль'),
(N'Auth.Reset.NewPassword',      'PL', N'Nowe hasło'),
(N'Auth.Reset.NewPassword',      'EN', N'New password'),
(N'Auth.Reset.NewPassword',      'DE', N'Neues Passwort'),
(N'Auth.Reset.NewPassword',      'RU', N'Новый пароль'),
(N'Auth.Reset.ConfirmPassword',  'PL', N'Powtórz hasło'),
(N'Auth.Reset.ConfirmPassword',  'EN', N'Confirm password'),
(N'Auth.Reset.ConfirmPassword',  'DE', N'Passwort bestätigen'),
(N'Auth.Reset.ConfirmPassword',  'RU', N'Повторите пароль'),
(N'Auth.Reset.Submit',           'PL', N'Zmień hasło'),
(N'Auth.Reset.Submit',           'EN', N'Change password'),
(N'Auth.Reset.Submit',           'DE', N'Passwort ändern'),
(N'Auth.Reset.Submit',           'RU', N'Изменить пароль'),
(N'Auth.Reset.Saving',           'PL', N'Zapisywanie...'),
(N'Auth.Reset.Saving',           'EN', N'Saving...'),
(N'Auth.Reset.Saving',           'DE', N'Wird gespeichert...'),
(N'Auth.Reset.Saving',           'RU', N'Сохранение...'),
(N'Auth.Reset.Success',          'PL', N'Hasło zostało zmienione! Przekierowanie do logowania...'),
(N'Auth.Reset.Success',          'EN', N'Your password has been changed! Redirecting to sign in...'),
(N'Auth.Reset.Success',          'DE', N'Ihr Passwort wurde geändert! Weiterleitung zur Anmeldung...'),
(N'Auth.Reset.Success',          'RU', N'Пароль изменён! Перенаправление на страницу входа...'),
(N'Auth.Reset.ErrorMismatch',    'PL', N'Hasła nie są identyczne.'),
(N'Auth.Reset.ErrorMismatch',    'EN', N'Passwords do not match.'),
(N'Auth.Reset.ErrorMismatch',    'DE', N'Die Passwörter stimmen nicht überein.'),
(N'Auth.Reset.ErrorMismatch',    'RU', N'Пароли не совпадают.'),
(N'Auth.Reset.ErrorTooShort',    'PL', N'Hasło musi mieć min. 5 znaków.'),
(N'Auth.Reset.ErrorTooShort',    'EN', N'Password must be at least 5 characters long.'),
(N'Auth.Reset.ErrorTooShort',    'DE', N'Das Passwort muss mindestens 5 Zeichen lang sein.'),
(N'Auth.Reset.ErrorTooShort',    'RU', N'Пароль должен содержать не менее 5 символов.'),
(N'Auth.Reset.Expired',          'PL', N'Link wygasł lub jest nieprawidłowy.'),
(N'Auth.Reset.Expired',          'EN', N'The link has expired or is invalid.'),
(N'Auth.Reset.Expired',          'DE', N'Der Link ist abgelaufen oder ungültig.'),
(N'Auth.Reset.Expired',          'RU', N'Срок действия ссылки истёк, или она недействительна.'),
(N'Auth.Reset.InvalidToken',     'PL', N'Nieprawidłowy link resetujący.'),
(N'Auth.Reset.InvalidToken',     'EN', N'Invalid reset link.'),
(N'Auth.Reset.InvalidToken',     'DE', N'Ungültiger Link zum Zurücksetzen.'),
(N'Auth.Reset.InvalidToken',     'RU', N'Недействительная ссылка для сброса.'),
(N'Auth.Reset.BackToLogin',      'PL', N'Wróć do logowania'),
(N'Auth.Reset.BackToLogin',      'EN', N'Back to sign in'),
(N'Auth.Reset.BackToLogin',      'DE', N'Zurück zur Anmeldung'),
(N'Auth.Reset.BackToLogin',      'RU', N'Вернуться ко входу'),

-- Profile
(N'Profile.Title',               'PL', N'Mój profil'),
(N'Profile.Title',               'EN', N'My profile'),
(N'Profile.Title',               'DE', N'Mein Profil'),
(N'Profile.Title',               'RU', N'Мой профиль'),
(N'Profile.UserData',            'PL', N'Dane użytkownika'),
(N'Profile.UserData',            'EN', N'User details'),
(N'Profile.UserData',            'DE', N'Benutzerdaten'),
(N'Profile.UserData',            'RU', N'Данные пользователя'),
(N'Profile.FirstName',           'PL', N'Imię'),
(N'Profile.FirstName',           'EN', N'First name'),
(N'Profile.FirstName',           'DE', N'Vorname'),
(N'Profile.FirstName',           'RU', N'Имя'),
(N'Profile.LastName',            'PL', N'Nazwisko'),
(N'Profile.LastName',            'EN', N'Last name'),
(N'Profile.LastName',            'DE', N'Nachname'),
(N'Profile.LastName',            'RU', N'Фамилия'),
(N'Profile.Email',               'PL', N'E-mail'),
(N'Profile.Email',               'EN', N'E-mail'),
(N'Profile.Email',               'DE', N'E-Mail'),
(N'Profile.Email',               'RU', N'Эл. почта'),
(N'Profile.Language',            'PL', N'Język'),
(N'Profile.Language',            'EN', N'Language'),
(N'Profile.Language',            'DE', N'Sprache'),
(N'Profile.Language',            'RU', N'Язык'),
(N'Profile.Save',                'PL', N'Zapisz zmiany'),
(N'Profile.Save',                'EN', N'Save changes'),
(N'Profile.Save',                'DE', N'Änderungen speichern'),
(N'Profile.Save',                'RU', N'Сохранить изменения'),
(N'Profile.SuccessSave',         'PL', N'Dane zostały zapisane.'),
(N'Profile.SuccessSave',         'EN', N'Your details have been saved.'),
(N'Profile.SuccessSave',         'DE', N'Ihre Daten wurden gespeichert.'),
(N'Profile.SuccessSave',         'RU', N'Данные сохранены.'),
(N'Profile.ErrorSave',           'PL', N'Nie udało się zapisać danych.'),
(N'Profile.ErrorSave',           'EN', N'Failed to save your details.'),
(N'Profile.ErrorSave',           'DE', N'Daten konnten nicht gespeichert werden.'),
(N'Profile.ErrorSave',           'RU', N'Не удалось сохранить данные.'),
(N'Profile.Security',            'PL', N'Bezpieczeństwo'),
(N'Profile.Security',            'EN', N'Security'),
(N'Profile.Security',            'DE', N'Sicherheit'),
(N'Profile.Security',            'RU', N'Безопасность'),
(N'Profile.CurrentPassword',     'PL', N'Obecne hasło'),
(N'Profile.CurrentPassword',     'EN', N'Current password'),
(N'Profile.CurrentPassword',     'DE', N'Aktuelles Passwort'),
(N'Profile.CurrentPassword',     'RU', N'Текущий пароль'),
(N'Profile.NewPassword',         'PL', N'Nowe hasło'),
(N'Profile.NewPassword',         'EN', N'New password'),
(N'Profile.NewPassword',         'DE', N'Neues Passwort'),
(N'Profile.NewPassword',         'RU', N'Новый пароль'),
(N'Profile.ConfirmPassword',     'PL', N'Powtórz nowe hasło'),
(N'Profile.ConfirmPassword',     'EN', N'Confirm new password'),
(N'Profile.ConfirmPassword',     'DE', N'Neues Passwort bestätigen'),
(N'Profile.ConfirmPassword',     'RU', N'Повторите новый пароль'),
(N'Profile.ChangePasswordBtn',   'PL', N'Zmień hasło'),
(N'Profile.ChangePasswordBtn',   'EN', N'Change password'),
(N'Profile.ChangePasswordBtn',   'DE', N'Passwort ändern'),
(N'Profile.ChangePasswordBtn',   'RU', N'Изменить пароль'),
(N'Profile.SuccessPasswordChange','PL', N'Hasło zostało zmienione.'),
(N'Profile.SuccessPasswordChange','EN', N'Your password has been changed.'),
(N'Profile.SuccessPasswordChange','DE', N'Ihr Passwort wurde geändert.'),
(N'Profile.SuccessPasswordChange','RU', N'Пароль изменён.'),
(N'Profile.ErrorPasswordChange', 'PL', N'Nie udało się zmienić hasła. Sprawdź obecne hasło.'),
(N'Profile.ErrorPasswordChange', 'EN', N'Failed to change password. Check your current password.'),
(N'Profile.ErrorPasswordChange', 'DE', N'Passwort konnte nicht geändert werden. Prüfen Sie Ihr aktuelles Passwort.'),
(N'Profile.ErrorPasswordChange', 'RU', N'Не удалось изменить пароль. Проверьте текущий пароль.'),
(N'Profile.ErrorPasswordMatch',  'PL', N'Nowe hasła nie są identyczne.'),
(N'Profile.ErrorPasswordMatch',  'EN', N'The new passwords do not match.'),
(N'Profile.ErrorPasswordMatch',  'DE', N'Die neuen Passwörter stimmen nicht überein.'),
(N'Profile.ErrorPasswordMatch',  'RU', N'Новые пароли не совпадают.');

BEGIN TRANSACTION;

INSERT INTO [dbo].[AppTranslations] (TranslationKey, LanguageCode, TranslatedText)
SELECT s.TranslationKey, s.LanguageCode, s.TranslatedText
FROM @t s
WHERE EXISTS (SELECT 1 FROM [dbo].[Languages] l WHERE l.LanguageCode = s.LanguageCode)
  AND NOT EXISTS (
      SELECT 1 FROM [dbo].[AppTranslations] a
      WHERE a.TranslationKey = s.TranslationKey AND a.LanguageCode = s.LanguageCode);

PRINT CONCAT('Dodano wierszy: ', @@ROWCOUNT);

COMMIT TRANSACTION;
GO
