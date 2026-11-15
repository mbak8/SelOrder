-- Kod ERP klienta: kolumna Tenants.ERPCode (opcjonalna, unikalna gdy podana) + tłumaczenia panelu administratora.
-- Skrypt jest idempotentny. Po uruchomieniu zrestartuj selorder-server (cache tłumaczeń).

USE [SelOrder];
GO

SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
SET ANSI_PADDING ON;
SET NOCOUNT ON;

IF COL_LENGTH('dbo.Tenants', 'ERPCode') IS NULL
    ALTER TABLE [dbo].[Tenants] ADD [ERPCode] [nvarchar](50) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UQ_Tenants_ERPCode' AND object_id = OBJECT_ID('dbo.Tenants'))
    CREATE UNIQUE NONCLUSTERED INDEX [UQ_Tenants_ERPCode] ON [dbo].[Tenants] ([ERPCode] ASC)
    WHERE ([ERPCode] IS NOT NULL);
GO

DECLARE @t TABLE (TranslationKey nvarchar(100) NOT NULL, LanguageCode char(2) NOT NULL, TranslatedText nvarchar(max) NOT NULL);

INSERT INTO @t (TranslationKey, LanguageCode, TranslatedText) VALUES
(N'Admin.Client.ErpCode',          'PL', N'Kod ERP'),
(N'Admin.Client.ErpCode',          'EN', N'ERP code'),
(N'Admin.Client.ErpCode',          'DE', N'ERP-Code'),
(N'Admin.Client.ErpCode',          'RU', N'Код ERP'),
(N'Admin.Client.ErpCodeHint',      'PL', N'Kod kontrahenta w systemie ERP. Opcjonalny, unikalny, można go zmienić.'),
(N'Admin.Client.ErpCodeHint',      'EN', N'Customer code in the ERP system. Optional, unique, can be changed later.'),
(N'Admin.Client.ErpCodeHint',      'DE', N'Kundencode im ERP-System. Optional, eindeutig, kann später geändert werden.'),
(N'Admin.Client.ErpCodeHint',      'RU', N'Код контрагента в системе ERP. Необязательный, уникальный, его можно изменить.'),
(N'Admin.Error.InvalidErpCode',    'PL', N'Kod ERP może mieć najwyżej 50 znaków.'),
(N'Admin.Error.InvalidErpCode',    'EN', N'The ERP code can be at most 50 characters long.'),
(N'Admin.Error.InvalidErpCode',    'DE', N'Der ERP-Code darf höchstens 50 Zeichen lang sein.'),
(N'Admin.Error.InvalidErpCode',    'RU', N'Код ERP может содержать не более 50 символов.'),
(N'Admin.Error.ErpCodeTaken',      'PL', N'Inny klient ma już taki kod ERP.'),
(N'Admin.Error.ErpCodeTaken',      'EN', N'Another client already has this ERP code.'),
(N'Admin.Error.ErpCodeTaken',      'DE', N'Ein anderer Kunde hat bereits diesen ERP-Code.'),
(N'Admin.Error.ErpCodeTaken',      'RU', N'У другого клиента уже есть такой код ERP.'),
(N'Admin.Error.TenantDuplicate',   'PL', N'Kod klienta lub kod ERP jest już używany przez innego klienta.'),
(N'Admin.Error.TenantDuplicate',   'EN', N'The client code or ERP code is already used by another client.'),
(N'Admin.Error.TenantDuplicate',   'DE', N'Der Kundencode oder ERP-Code wird bereits von einem anderen Kunden verwendet.'),
(N'Admin.Error.TenantDuplicate',   'RU', N'Код клиента или код ERP уже используется другим клиентом.');

INSERT INTO dbo.AppTranslations (TranslationKey, LanguageCode, TranslatedText)
SELECT s.TranslationKey, s.LanguageCode, s.TranslatedText
FROM @t s
WHERE EXISTS (SELECT 1 FROM dbo.Languages l WHERE l.LanguageCode = s.LanguageCode)
  AND NOT EXISTS (SELECT 1 FROM dbo.AppTranslations a
                  WHERE a.TranslationKey = s.TranslationKey AND a.LanguageCode = s.LanguageCode);

PRINT CONCAT('Dodano tłumaczeń: ', @@ROWCOUNT);
GO
