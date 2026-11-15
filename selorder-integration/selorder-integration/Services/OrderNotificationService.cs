using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Resend;
using SelOrder.Shared.Email;

namespace SelOrderIntegration.Services;

// Powiadomienia mailowe o eksporcie zamówień do ERP. Szkielet pod przyszły serwis eksportu:
//   - po udanym eksporcie:  await notifications.SendOrderExportedAsync(orderId);
//   - po błędzie eksportu:  await notifications.SendOrderExportFailedAsync(orderId, ex.Message);
// Odbiorcy:
//   - admini      = aktywni użytkownicy aktywnego tenanta nadrzędnego (Tenants.IsMaster = 1) z adresem e-mail,
//                   każdy w języku swojego konta (Users.LanguageCode),
//   - superadmin  = adres z konfiguracji Notifications:SuperAdminEmail (appsettings.Local.json),
//                   w języku konta o tym adresie, a gdy go nie ma – po polsku.
// Ten sam adres dostaje jeden mail. Błędy wysyłki są tylko wypisywane – nie przerywają eksportu.
// Treść buduje wspólny szablon selorder-shared/Email/OrderEmailTemplate.cs (tłumaczenia Email.Order.*).
public class OrderNotificationService(IConfiguration configuration, IResend resend)
{
    private sealed class Recipient
    {
        public string Email { get; set; } = "";
        public string LanguageCode { get; set; } = "PL";
    }

    private sealed class TranslationRow
    {
        public string TranslationKey { get; set; } = "";
        public string TranslatedText { get; set; } = "";
    }

    // Zamówienie wyeksportowane do ERP -> admini i superadmin
    public async Task SendOrderExportedAsync(int orderId, CancellationToken ct = default)
    {
        await SendAsync(OrderEmailKind.Exported, orderId, errorMessage: null, includeAdmins: true, ct);
    }

    // Błąd eksportu zamówienia -> superadmin
    public async Task SendOrderExportFailedAsync(int orderId, string errorMessage, CancellationToken ct = default)
    {
        await SendAsync(OrderEmailKind.ExportFailed, orderId, errorMessage, includeAdmins: false, ct);
    }

    private async Task SendAsync(OrderEmailKind kind, int orderId, string? errorMessage, bool includeAdmins, CancellationToken ct)
    {
        try
        {
            await using var connection = new SqlConnection(ConnectionString);
            await connection.OpenAsync(ct);

            var recipients = await GetRecipientsAsync(connection, includeAdmins, ct);
            if (recipients.Count == 0)
            {
                WriteWarning($"Zamówienie {orderId}: brak odbiorców maila {kind} (sprawdź Notifications:SuperAdminEmail).");
                return;
            }

            foreach (var group in recipients.GroupBy(r => r.LanguageCode))
            {
                var order = await LoadOrderAsync(connection, orderId, group.Key, ct);
                if (order == null)
                {
                    WriteWarning($"Zamówienie {orderId}: nie znaleziono zamówienia, mail {kind} nie został wysłany.");
                    return;
                }

                var dict = await LoadTranslationsAsync(connection, group.Key, ct);
                var message = OrderEmailTemplate.Build(kind, order, group.Key,
                    (key, fallback) => dict.TryGetValue(key, out var text) && !string.IsNullOrWhiteSpace(text) ? text : fallback,
                    errorMessage);

                foreach (var recipient in group)
                {
                    try
                    {
                        await SendEmailAsync(recipient.Email, message, ct);
                        Console.WriteLine($"Zamówienie {orderId}: wysłano mail {kind} ({group.Key}).");
                    }
                    catch (Exception ex)
                    {
                        WriteError($"Zamówienie {orderId}: nie udało się wysłać maila {kind}: {ex.Message}");
                    }
                }
            }
        }
        catch (Exception ex)
        {
            WriteError($"Zamówienie {orderId}: błąd przygotowania maila {kind}: {ex.Message}");
        }
    }

    private string ConnectionString =>
        configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException("Brak ConnectionString w pliku appsettings.json.");

    private async Task<List<Recipient>> GetRecipientsAsync(SqlConnection connection, bool includeAdmins, CancellationToken ct)
    {
        var recipients = new List<Recipient>();

        void Add(string? email, string? languageCode)
        {
            email = email?.Trim();
            if (string.IsNullOrEmpty(email)) return;
            if (recipients.Any(r => r.Email.Equals(email, StringComparison.OrdinalIgnoreCase))) return;
            recipients.Add(new Recipient { Email = email, LanguageCode = OrderEmailTemplate.NormalizeLanguage(languageCode) });
        }

        if (includeAdmins)
        {
            const string adminsSql = @"
                SELECT u.Email, u.LanguageCode
                FROM dbo.Users u
                JOIN dbo.Tenants t ON t.TenantId = u.TenantId
                WHERE t.IsMaster = 1 AND t.IsActive = 1
                  AND u.IsActive = 1 AND u.Email IS NOT NULL AND u.Email <> ''
                ORDER BY u.UserId";

            var admins = await connection.QueryAsync<Recipient>(new CommandDefinition(adminsSql, cancellationToken: ct));
            foreach (var admin in admins) Add(admin.Email, admin.LanguageCode);
        }

        var superAdminEmail = configuration["Notifications:SuperAdminEmail"]?.Trim();
        if (!string.IsNullOrEmpty(superAdminEmail))
        {
            var language = await connection.QueryFirstOrDefaultAsync<string?>(new CommandDefinition(
                "SELECT TOP 1 LanguageCode FROM dbo.Users WHERE Email = @Email",
                new { Email = superAdminEmail }, cancellationToken: ct));
            Add(superAdminEmail, language);
        }

        return recipients;
    }

    // Zamówienie z pozycjami w danym języku (nazwy artykułów i jednostek z tłumaczeń, fallback: nazwa podstawowa)
    private static async Task<OrderEmailData?> LoadOrderAsync(SqlConnection connection, int orderId, string lang, CancellationToken ct)
    {
        const string orderSql = @"
            SELECT o.OrderNumber, o.OrderDate, t.Code AS ClientCode, t.CompanyName AS ClientName,
                   COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(u.FirstName, ' ', u.LastName))), ''), u.Login) AS CreatedBy,
                   o.Notes, o.ERPDocName AS ErpDocument
            FROM dbo.Orders o
            JOIN dbo.Tenants t ON t.TenantId = o.TenantId
            JOIN dbo.Users u ON u.UserId = o.UserId
            WHERE o.OrderId = @OrderId";

        var order = await connection.QueryFirstOrDefaultAsync<OrderEmailData>(
            new CommandDefinition(orderSql, new { OrderId = orderId }, cancellationToken: ct));
        if (order == null) return null;

        const string itemsSql = @"
            SELECT a.Code AS ArticleCode,
                   COALESCE(atr.Name, a.Name) AS ArticleName,
                   i.Quantity,
                   COALESCE(ut.Name, un.InternalName, '') AS UnitName,
                   COALESCE(un.DecimalPlaces, 0) AS DecimalPlaces
            FROM dbo.OrderItems i
            JOIN dbo.Articles a ON a.ArticleId = i.ArticleId
            LEFT JOIN dbo.ArticlesTranslations atr ON atr.ArticleId = a.ArticleId AND atr.LanguageCode = @Lang
            LEFT JOIN dbo.Units un ON un.UnitId = a.UnitId
            LEFT JOIN dbo.UnitTranslations ut ON ut.UnitId = un.UnitId AND ut.LanguageCode = @Lang
            WHERE i.OrderId = @OrderId
            ORDER BY i.OrderItemId";

        order.Items = (await connection.QueryAsync<OrderEmailItem>(
            new CommandDefinition(itemsSql, new { OrderId = orderId, Lang = lang }, cancellationToken: ct))).ToList();

        return order;
    }

    private static async Task<Dictionary<string, string>> LoadTranslationsAsync(SqlConnection connection, string lang, CancellationToken ct)
    {
        const string sql = @"
            SELECT TranslationKey, TranslatedText
            FROM dbo.AppTranslations
            WHERE LanguageCode = @Lang AND TranslationKey LIKE 'Email.Order.%'";

        var rows = await connection.QueryAsync<TranslationRow>(
            new CommandDefinition(sql, new { Lang = lang }, cancellationToken: ct));
        return rows.ToDictionary(r => r.TranslationKey, r => r.TranslatedText);
    }

    private async Task SendEmailAsync(string toEmail, OrderEmailMessage content, CancellationToken ct)
    {
        var message = new EmailMessage
        {
            From = configuration["EmailSettings:From"] ?? string.Empty,
            Subject = content.Subject,
            HtmlBody = content.HtmlBody,
            // Logo osadzone w treści (cid:) – klient pocztowy pokazuje je w mailu, nie jako zwykły załącznik
            Attachments = content.InlineImages
                .Select(img => new EmailAttachment
                {
                    Filename = img.FileName,
                    Content = img.Content,
                    ContentType = img.ContentType,
                    ContentId = img.ContentId
                })
                .ToList()
        };
        message.To.Add(toEmail);
        await resend.EmailSendAsync(message, ct);
    }

    private static void WriteWarning(string text)
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine(text);
        Console.ResetColor();
    }

    private static void WriteError(string text)
    {
        Console.ForegroundColor = ConsoleColor.Red;
        Console.WriteLine(text);
        Console.ResetColor();
    }
}
