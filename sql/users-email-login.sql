-- Logowanie loginem LUB adresem e-mail.
-- 1. E-mail użytkownika musi być unikalny (zastępujemy nieunikalny IX_Users_Email unikalnym UQ_Users_Email).
-- 2. Etykieta pola logowania: "Login lub e-mail" + komunikat o zajętym e-mailu w profilu.
-- Skrypt jest idempotentny. Po uruchomieniu zrestartuj selorder-server (cache tłumaczeń).

USE [SelOrder];
GO

-- Wymagane dla indeksów filtrowanych (sqlcmd domyślnie ma QUOTED_IDENTIFIER OFF)
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;

-- Duplikaty e-maili zablokowałyby utworzenie unikalnego indeksu – najpierw je pokazujemy i przerywamy
IF EXISTS (SELECT Email FROM dbo.Users WHERE Email IS NOT NULL GROUP BY Email HAVING COUNT(*) > 1)
BEGIN
    SELECT Email, COUNT(*) AS Konta FROM dbo.Users WHERE Email IS NOT NULL GROUP BY Email HAVING COUNT(*) > 1;
    RAISERROR(N'W tabeli Users są zduplikowane adresy e-mail (lista powyżej). Popraw je i uruchom skrypt ponownie.', 16, 1);
    SET NOEXEC ON;
END
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Users_Email' AND object_id = OBJECT_ID('dbo.Users'))
    DROP INDEX [IX_Users_Email] ON [dbo].[Users];
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Users_Email' AND object_id = OBJECT_ID('dbo.Users'))
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_Users_Email] ON [dbo].[Users] ([Email] ASC) WHERE ([Email] IS NOT NULL);
GO

DECLARE @t TABLE (TranslationKey nvarchar(100) NOT NULL, LanguageCode char(2) NOT NULL, TranslatedText nvarchar(max) NOT NULL);

INSERT INTO @t (TranslationKey, LanguageCode, TranslatedText) VALUES
(N'Login.Username',          'PL', N'Login lub e-mail'),
(N'Login.Username',          'EN', N'Username or e-mail'),
(N'Login.Username',          'DE', N'Benutzername oder E-Mail'),
(N'Login.Username',          'RU', N'Логин или эл. почта'),
(N'Profile.ErrorEmailTaken', 'PL', N'Ten adres e-mail jest już używany przez inne konto.'),
(N'Profile.ErrorEmailTaken', 'EN', N'This e-mail address is already used by another account.'),
(N'Profile.ErrorEmailTaken', 'DE', N'Diese E-Mail-Adresse wird bereits von einem anderen Konto verwendet.'),
(N'Profile.ErrorEmailTaken', 'RU', N'Этот адрес эл. почты уже используется другой учётной записью.');

-- Aktualizacja istniejących tekstów
UPDATE a SET a.TranslatedText = s.TranslatedText
FROM dbo.AppTranslations a
JOIN @t s ON s.TranslationKey = a.TranslationKey AND s.LanguageCode = a.LanguageCode
WHERE a.TranslatedText <> s.TranslatedText;

PRINT CONCAT('Zaktualizowano tłumaczeń: ', @@ROWCOUNT);

-- Dodanie brakujących
INSERT INTO dbo.AppTranslations (TranslationKey, LanguageCode, TranslatedText)
SELECT s.TranslationKey, s.LanguageCode, s.TranslatedText
FROM @t s
WHERE EXISTS (SELECT 1 FROM dbo.Languages l WHERE l.LanguageCode = s.LanguageCode)
  AND NOT EXISTS (SELECT 1 FROM dbo.AppTranslations a
                  WHERE a.TranslationKey = s.TranslationKey AND a.LanguageCode = s.LanguageCode);

PRINT CONCAT('Dodano tłumaczeń: ', @@ROWCOUNT);
GO

SET NOEXEC OFF;
GO
