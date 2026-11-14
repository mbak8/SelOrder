-- Tłumaczenia dla tworzenia nowego zamówienia (przycisk "Nowe zamówienie" na liście zamówień).
-- Skrypt jest idempotentny: wstawia tylko brakujące wiersze.
-- Po uruchomieniu zrestartuj selorder-server (cache tłumaczeń).

USE [SelOrder];
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;

DECLARE @t TABLE (TranslationKey nvarchar(100) NOT NULL, LanguageCode char(2) NOT NULL, TranslatedText nvarchar(max) NOT NULL);

INSERT INTO @t (TranslationKey, LanguageCode, TranslatedText) VALUES
(N'Order.New',      'PL', N'Nowe zamówienie'),
(N'Order.New',      'EN', N'New order'),
(N'Order.New',      'DE', N'Neue Bestellung'),
(N'Order.New',      'RU', N'Новый заказ'),
(N'Order.NotSaved', 'PL', N'Niezapisane'),
(N'Order.NotSaved', 'EN', N'Not saved'),
(N'Order.NotSaved', 'DE', N'Nicht gespeichert'),
(N'Order.NotSaved', 'RU', N'Не сохранён'),
(N'Order.Created',  'PL', N'Utworzono zamówienie'),
(N'Order.Created',  'EN', N'Order created:'),
(N'Order.Created',  'DE', N'Bestellung angelegt:'),
(N'Order.Created',  'RU', N'Создан заказ');

INSERT INTO dbo.AppTranslations (TranslationKey, LanguageCode, TranslatedText)
SELECT s.TranslationKey, s.LanguageCode, s.TranslatedText
FROM @t s
WHERE EXISTS (SELECT 1 FROM dbo.Languages l WHERE l.LanguageCode = s.LanguageCode)
  AND NOT EXISTS (SELECT 1 FROM dbo.AppTranslations a
                  WHERE a.TranslationKey = s.TranslationKey AND a.LanguageCode = s.LanguageCode);

PRINT CONCAT('Dodano tłumaczeń: ', @@ROWCOUNT);
GO
