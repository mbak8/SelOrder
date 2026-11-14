-- Ponowne wybranie artykułu, który już jest na zamówieniu: zamiast zwiększać ilość o 1,
-- strona przechodzi do istniejącej pozycji. Teksty: komunikat i oznaczenie w podpowiedziach wyszukiwarki.
-- Skrypt jest idempotentny: wstawia tylko brakujące wiersze. Po uruchomieniu zrestartuj selorder-server.

USE [SelOrder];
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;

DECLARE @t TABLE (TranslationKey nvarchar(100) NOT NULL, LanguageCode char(2) NOT NULL, TranslatedText nvarchar(max) NOT NULL);

INSERT INTO @t (TranslationKey, LanguageCode, TranslatedText) VALUES
(N'Order.AlreadyOnList', 'PL', N'Ten artykuł jest już na liście – zmień ilość w tabeli.'),
(N'Order.AlreadyOnList', 'EN', N'This item is already on the list – change the quantity in the table.'),
(N'Order.AlreadyOnList', 'DE', N'Dieser Artikel ist bereits in der Liste – ändern Sie die Menge in der Tabelle.'),
(N'Order.AlreadyOnList', 'RU', N'Этот товар уже есть в списке – измените количество в таблице.'),
(N'Order.OnList',        'PL', N'na liście'),
(N'Order.OnList',        'EN', N'on the list'),
(N'Order.OnList',        'DE', N'in der Liste'),
(N'Order.OnList',        'RU', N'в списке');

INSERT INTO dbo.AppTranslations (TranslationKey, LanguageCode, TranslatedText)
SELECT s.TranslationKey, s.LanguageCode, s.TranslatedText
FROM @t s
WHERE EXISTS (SELECT 1 FROM dbo.Languages l WHERE l.LanguageCode = s.LanguageCode)
  AND NOT EXISTS (SELECT 1 FROM dbo.AppTranslations a
                  WHERE a.TranslationKey = s.TranslationKey AND a.LanguageCode = s.LanguageCode);

PRINT CONCAT('Dodano tłumaczeń: ', @@ROWCOUNT);
GO
