-- Uwagi do zamówienia: kolumna Orders.Notes + tłumaczenia pola na stronie zamówienia.
-- Skrypt jest idempotentny. Po uruchomieniu zrestartuj selorder-server (cache tłumaczeń).

USE [SelOrder];
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;

IF COL_LENGTH('dbo.Orders', 'Notes') IS NULL
    ALTER TABLE [dbo].[Orders] ADD [Notes] [nvarchar](1000) NULL;
GO

DECLARE @t TABLE (TranslationKey nvarchar(100) NOT NULL, LanguageCode char(2) NOT NULL, TranslatedText nvarchar(max) NOT NULL);

INSERT INTO @t (TranslationKey, LanguageCode, TranslatedText) VALUES
(N'Order.Notes',             'PL', N'Uwagi'),
(N'Order.Notes',             'EN', N'Notes'),
(N'Order.Notes',             'DE', N'Bemerkungen'),
(N'Order.Notes',             'RU', N'Примечания'),
(N'Order.NotesPlaceholder',  'PL', N'Uwagi do zamówienia...'),
(N'Order.NotesPlaceholder',  'EN', N'Notes for the order...'),
(N'Order.NotesPlaceholder',  'DE', N'Bemerkungen zur Bestellung...'),
(N'Order.NotesPlaceholder',  'RU', N'Примечания к заказу...'),
(N'Order.NoNotes',           'PL', N'Brak uwag'),
(N'Order.NoNotes',           'EN', N'No notes'),
(N'Order.NoNotes',           'DE', N'Keine Bemerkungen'),
(N'Order.NoNotes',           'RU', N'Нет примечаний'),
(N'Order.Error.NotesTooLong','PL', N'Uwagi mogą mieć najwyżej 1000 znaków.'),
(N'Order.Error.NotesTooLong','EN', N'Notes can be at most 1000 characters long.'),
(N'Order.Error.NotesTooLong','DE', N'Bemerkungen dürfen höchstens 1000 Zeichen lang sein.'),
(N'Order.Error.NotesTooLong','RU', N'Примечания могут содержать не более 1000 символов.');

INSERT INTO dbo.AppTranslations (TranslationKey, LanguageCode, TranslatedText)
SELECT s.TranslationKey, s.LanguageCode, s.TranslatedText
FROM @t s
WHERE EXISTS (SELECT 1 FROM dbo.Languages l WHERE l.LanguageCode = s.LanguageCode)
  AND NOT EXISTS (SELECT 1 FROM dbo.AppTranslations a
                  WHERE a.TranslationKey = s.TranslationKey AND a.LanguageCode = s.LanguageCode);

PRINT CONCAT('Dodano tłumaczeń: ', @@ROWCOUNT);
GO
