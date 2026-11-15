-- Tłumaczenia maili o zamówieniach (wspólny szablon selorder-shared/Email/OrderEmailTemplate.cs):
--   Submitted    – potwierdzenie zatwierdzenia, do twórcy (selorder-server, OrderEmailService)
--   Exported     – wyeksportowane do ERP, do adminów i superadmina (selorder-integration, OrderNotificationService)
--   ExportFailed – błąd eksportu, do superadmina (selorder-integration, OrderNotificationService)
-- {0} w tematach = numer zamówienia. Brakujący klucz -> polski tekst z kodu.
-- Skrypt jest idempotentny. Po uruchomieniu zrestartuj selorder-server (cache tłumaczeń).

USE [SelOrder];
GO

SET NOCOUNT ON;

DECLARE @t TABLE (TranslationKey nvarchar(100) NOT NULL, LanguageCode char(2) NOT NULL, TranslatedText nvarchar(max) NOT NULL);

INSERT INTO @t (TranslationKey, LanguageCode, TranslatedText) VALUES
(N'Email.Order.Submitted.Subject',    'PL', N'Potwierdzenie zamówienia {0}'),
(N'Email.Order.Submitted.Subject',    'EN', N'Order confirmation {0}'),
(N'Email.Order.Submitted.Subject',    'DE', N'Bestellbestätigung {0}'),
(N'Email.Order.Submitted.Subject',    'RU', N'Подтверждение заказа {0}'),
(N'Email.Order.Submitted.Intro',      'PL', N'Zamówienie zostało zatwierdzone. Poniżej jego szczegóły.'),
(N'Email.Order.Submitted.Intro',      'EN', N'The order has been submitted. Details are below.'),
(N'Email.Order.Submitted.Intro',      'DE', N'Die Bestellung wurde abgesendet. Die Details finden Sie unten.'),
(N'Email.Order.Submitted.Intro',      'RU', N'Заказ оформлен. Подробности ниже.'),
(N'Email.Order.Exported.Subject',     'PL', N'Zamówienie {0} wyeksportowane do ERP'),
(N'Email.Order.Exported.Subject',     'EN', N'Order {0} exported to ERP'),
(N'Email.Order.Exported.Subject',     'DE', N'Bestellung {0} in das ERP exportiert'),
(N'Email.Order.Exported.Subject',     'RU', N'Заказ {0} экспортирован в ERP'),
(N'Email.Order.Exported.Intro',       'PL', N'Zamówienie zostało wyeksportowane do systemu ERP.'),
(N'Email.Order.Exported.Intro',       'EN', N'The order has been exported to the ERP system.'),
(N'Email.Order.Exported.Intro',       'DE', N'Die Bestellung wurde in das ERP-System exportiert.'),
(N'Email.Order.Exported.Intro',       'RU', N'Заказ экспортирован в систему ERP.'),
(N'Email.Order.ExportFailed.Subject', 'PL', N'Błąd eksportu zamówienia {0}'),
(N'Email.Order.ExportFailed.Subject', 'EN', N'Export of order {0} failed'),
(N'Email.Order.ExportFailed.Subject', 'DE', N'Fehler beim Export der Bestellung {0}'),
(N'Email.Order.ExportFailed.Subject', 'RU', N'Ошибка экспорта заказа {0}'),
(N'Email.Order.ExportFailed.Intro',   'PL', N'Eksport zamówienia do systemu ERP nie powiódł się.'),
(N'Email.Order.ExportFailed.Intro',   'EN', N'Exporting the order to the ERP system failed.'),
(N'Email.Order.ExportFailed.Intro',   'DE', N'Der Export der Bestellung in das ERP-System ist fehlgeschlagen.'),
(N'Email.Order.ExportFailed.Intro',   'RU', N'Не удалось экспортировать заказ в систему ERP.'),
(N'Email.Order.Error',                'PL', N'Treść błędu'),
(N'Email.Order.Error',                'EN', N'Error details'),
(N'Email.Order.Error',                'DE', N'Fehlermeldung'),
(N'Email.Order.Error',                'RU', N'Текст ошибки'),
(N'Email.Order.Number',               'PL', N'Numer zamówienia'),
(N'Email.Order.Number',               'EN', N'Order number'),
(N'Email.Order.Number',               'DE', N'Bestellnummer'),
(N'Email.Order.Number',               'RU', N'Номер заказа'),
(N'Email.Order.Date',                 'PL', N'Data zamówienia'),
(N'Email.Order.Date',                 'EN', N'Order date'),
(N'Email.Order.Date',                 'DE', N'Bestelldatum'),
(N'Email.Order.Date',                 'RU', N'Дата заказа'),
(N'Email.Order.Client',               'PL', N'Klient'),
(N'Email.Order.Client',               'EN', N'Customer'),
(N'Email.Order.Client',               'DE', N'Kunde'),
(N'Email.Order.Client',               'RU', N'Клиент'),
(N'Email.Order.CreatedBy',            'PL', N'Autor'),
(N'Email.Order.CreatedBy',            'EN', N'Created by'),
(N'Email.Order.CreatedBy',            'DE', N'Erstellt von'),
(N'Email.Order.CreatedBy',            'RU', N'Автор'),
(N'Email.Order.ErpDocument',          'PL', N'Dokument ERP'),
(N'Email.Order.ErpDocument',          'EN', N'ERP document'),
(N'Email.Order.ErpDocument',          'DE', N'ERP-Beleg'),
(N'Email.Order.ErpDocument',          'RU', N'Документ ERP'),
(N'Email.Order.Notes',                'PL', N'Uwagi'),
(N'Email.Order.Notes',                'EN', N'Notes'),
(N'Email.Order.Notes',                'DE', N'Bemerkungen'),
(N'Email.Order.Notes',                'RU', N'Примечания'),
(N'Email.Order.Items.No',             'PL', N'Lp.'),
(N'Email.Order.Items.No',             'EN', N'No.'),
(N'Email.Order.Items.No',             'DE', N'Nr.'),
(N'Email.Order.Items.No',             'RU', N'№'),
(N'Email.Order.Items.Code',           'PL', N'Kod'),
(N'Email.Order.Items.Code',           'EN', N'Code'),
(N'Email.Order.Items.Code',           'DE', N'Code'),
(N'Email.Order.Items.Code',           'RU', N'Код'),
(N'Email.Order.Items.Name',           'PL', N'Nazwa'),
(N'Email.Order.Items.Name',           'EN', N'Name'),
(N'Email.Order.Items.Name',           'DE', N'Bezeichnung'),
(N'Email.Order.Items.Name',           'RU', N'Наименование'),
(N'Email.Order.Items.Quantity',       'PL', N'Ilość'),
(N'Email.Order.Items.Quantity',       'EN', N'Quantity'),
(N'Email.Order.Items.Quantity',       'DE', N'Menge'),
(N'Email.Order.Items.Quantity',       'RU', N'Количество'),
(N'Email.Order.Items.Unit',           'PL', N'J.m.'),
(N'Email.Order.Items.Unit',           'EN', N'Unit'),
(N'Email.Order.Items.Unit',           'DE', N'Einheit'),
(N'Email.Order.Items.Unit',           'RU', N'Ед. изм.'),
(N'Email.Order.Footer',               'PL', N'Wiadomość wygenerowana automatycznie przez SelOrder – prosimy na nią nie odpowiadać.'),
(N'Email.Order.Footer',               'EN', N'This message was generated automatically by SelOrder – please do not reply.'),
(N'Email.Order.Footer',               'DE', N'Diese Nachricht wurde automatisch von SelOrder erstellt – bitte antworten Sie nicht darauf.'),
(N'Email.Order.Footer',               'RU', N'Это сообщение сформировано автоматически системой SelOrder – пожалуйста, не отвечайте на него.');

INSERT INTO dbo.AppTranslations (TranslationKey, LanguageCode, TranslatedText)
SELECT s.TranslationKey, s.LanguageCode, s.TranslatedText
FROM @t s
WHERE EXISTS (SELECT 1 FROM dbo.Languages l WHERE l.LanguageCode = s.LanguageCode)
  AND NOT EXISTS (SELECT 1 FROM dbo.AppTranslations a
                  WHERE a.TranslationKey = s.TranslationKey AND a.LanguageCode = s.LanguageCode);

PRINT CONCAT('Dodano tłumaczeń: ', @@ROWCOUNT);
GO
