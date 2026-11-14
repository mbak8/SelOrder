-- Przycisk zatwierdzania zamówienia: "Zatwierdź" -> "Zatwierdź zamówienie" (analogicznie do "Anuluj zamówienie").
-- Inne języki: zamiast "Approve" (= akceptacja cudzej prośby) - "Submit order" (klient składa zamówienie).
-- Status 5 i pytanie potwierdzające dopasowane do nowej nazwy. Polski status "Zatwierdzone" bez zmian.
-- Skrypt jest idempotentny (aktualizuje istniejące, dodaje brakujące). Po uruchomieniu zrestartuj selorder-server.

USE [SelOrder];
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET NOCOUNT ON;

DECLARE @t TABLE (TranslationKey nvarchar(100) NOT NULL, LanguageCode char(2) NOT NULL, TranslatedText nvarchar(max) NOT NULL);

INSERT INTO @t (TranslationKey, LanguageCode, TranslatedText) VALUES
(N'Order.Approve',        'PL', N'Zatwierdź zamówienie'),
(N'Order.Approve',        'EN', N'Submit order'),
(N'Order.Approve',        'DE', N'Bestellung absenden'),
(N'Order.Approve',        'RU', N'Оформить заказ'),
(N'Order.ConfirmApprove', 'PL', N'Zatwierdzić zamówienie? Po zatwierdzeniu nie będzie można go edytować.'),
(N'Order.ConfirmApprove', 'EN', N'Submit the order? It cannot be edited afterwards.'),
(N'Order.ConfirmApprove', 'DE', N'Bestellung absenden? Danach kann sie nicht mehr bearbeitet werden.'),
(N'Order.ConfirmApprove', 'RU', N'Оформить заказ? После этого его нельзя будет изменить.'),
(N'Order.Status.5',       'PL', N'Zatwierdzone'),
(N'Order.Status.5',       'EN', N'Submitted'),
(N'Order.Status.5',       'DE', N'Abgesendet'),
(N'Order.Status.5',       'RU', N'Оформлен');

UPDATE a SET a.TranslatedText = s.TranslatedText
FROM dbo.AppTranslations a
JOIN @t s ON s.TranslationKey = a.TranslationKey AND s.LanguageCode = a.LanguageCode
WHERE a.TranslatedText <> s.TranslatedText;

PRINT CONCAT('Zaktualizowano tłumaczeń: ', @@ROWCOUNT);

INSERT INTO dbo.AppTranslations (TranslationKey, LanguageCode, TranslatedText)
SELECT s.TranslationKey, s.LanguageCode, s.TranslatedText
FROM @t s
WHERE EXISTS (SELECT 1 FROM dbo.Languages l WHERE l.LanguageCode = s.LanguageCode)
  AND NOT EXISTS (SELECT 1 FROM dbo.AppTranslations a
                  WHERE a.TranslationKey = s.TranslationKey AND a.LanguageCode = s.LanguageCode);

PRINT CONCAT('Dodano tłumaczeń: ', @@ROWCOUNT);
GO
