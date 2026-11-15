-- Tłumaczenia maila z linkiem do resetu hasła (EmailService.SendPasswordResetEmailAsync).
-- Mail idzie w języku wybranym w oknie resetu hasła (Accept-Language); brakujący klucz -> polski tekst z kodu.
-- Skrypt jest idempotentny. Po uruchomieniu zrestartuj selorder-server (cache tłumaczeń).

USE [SelOrder];
GO

SET NOCOUNT ON;

DECLARE @t TABLE (TranslationKey nvarchar(100) NOT NULL, LanguageCode char(2) NOT NULL, TranslatedText nvarchar(max) NOT NULL);

INSERT INTO @t (TranslationKey, LanguageCode, TranslatedText) VALUES
(N'Email.PasswordReset.Subject',     'PL', N'Resetowanie hasła - SelOrder'),
(N'Email.PasswordReset.Subject',     'EN', N'Password reset - SelOrder'),
(N'Email.PasswordReset.Subject',     'DE', N'Passwort zurücksetzen - SelOrder'),
(N'Email.PasswordReset.Subject',     'RU', N'Сброс пароля - SelOrder'),
(N'Email.PasswordReset.Greeting',    'PL', N'Cześć!'),
(N'Email.PasswordReset.Greeting',    'EN', N'Hello!'),
(N'Email.PasswordReset.Greeting',    'DE', N'Hallo!'),
(N'Email.PasswordReset.Greeting',    'RU', N'Здравствуйте!'),
(N'Email.PasswordReset.Intro',       'PL', N'Otrzymaliśmy prośbę o reset hasła.'),
(N'Email.PasswordReset.Intro',       'EN', N'We have received a request to reset your password.'),
(N'Email.PasswordReset.Intro',       'DE', N'Wir haben eine Anfrage zum Zurücksetzen Ihres Passworts erhalten.'),
(N'Email.PasswordReset.Intro',       'RU', N'Мы получили запрос на сброс пароля.'),
(N'Email.PasswordReset.Instruction', 'PL', N'Kliknij poniższy link, aby ustawić nowe hasło (link ważny 1 godzinę):'),
(N'Email.PasswordReset.Instruction', 'EN', N'Click the link below to set a new password (the link is valid for 1 hour):'),
(N'Email.PasswordReset.Instruction', 'DE', N'Klicken Sie auf den folgenden Link, um ein neues Passwort festzulegen (der Link ist 1 Stunde gültig):'),
(N'Email.PasswordReset.Instruction', 'RU', N'Нажмите на ссылку ниже, чтобы установить новый пароль (ссылка действительна 1 час):'),
(N'Email.PasswordReset.Button',      'PL', N'ZRESETUJ HASŁO'),
(N'Email.PasswordReset.Button',      'EN', N'RESET PASSWORD'),
(N'Email.PasswordReset.Button',      'DE', N'PASSWORT ZURÜCKSETZEN'),
(N'Email.PasswordReset.Button',      'RU', N'СБРОСИТЬ ПАРОЛЬ'),
(N'Email.PasswordReset.Ignore',      'PL', N'Jeśli to nie Ty, zignoruj tę wiadomość.'),
(N'Email.PasswordReset.Ignore',      'EN', N'If you did not request this, please ignore this message.'),
(N'Email.PasswordReset.Ignore',      'DE', N'Falls Sie das nicht angefordert haben, ignorieren Sie bitte diese Nachricht.'),
(N'Email.PasswordReset.Ignore',      'RU', N'Если вы не запрашивали сброс пароля, просто проигнорируйте это сообщение.');

INSERT INTO dbo.AppTranslations (TranslationKey, LanguageCode, TranslatedText)
SELECT s.TranslationKey, s.LanguageCode, s.TranslatedText
FROM @t s
WHERE EXISTS (SELECT 1 FROM dbo.Languages l WHERE l.LanguageCode = s.LanguageCode)
  AND NOT EXISTS (SELECT 1 FROM dbo.AppTranslations a
                  WHERE a.TranslationKey = s.TranslationKey AND a.LanguageCode = s.LanguageCode);

PRINT CONCAT('Dodano tłumaczeń: ', @@ROWCOUNT);
GO
