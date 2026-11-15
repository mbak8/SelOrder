using Data;
using Microsoft.EntityFrameworkCore;
using Resend;
using SelOrder.Shared.Email;

namespace Services;

// Maile o zamówieniach wysyłane przez serwer: potwierdzenie zatwierdzenia dla twórcy.
// Maile o eksporcie do ERP (do adminów i superadmina) wysyła selorder-integration (OrderNotificationService).
// Treść buduje wspólny szablon selorder-shared/Email/OrderEmailTemplate.cs.
public class OrderEmailService(
    AppDbContext db,
    IAppUserContext userContext,
    TranslationService translations,
    IResend resend,
    IConfiguration config,
    ILogger<OrderEmailService> logger)
{
    private readonly string _fromEmail = config["EmailSettings:From"] ?? string.Empty;

    // IsMaster – odbiorca z tenanta nadrzędnego; tylko on widzi w mailu wiersz "Klient"
    private sealed record Recipient(string Email, string LanguageCode, bool IsMaster);

    // Potwierdzenie zatwierdzenia zamówienia. Odbiorcy ("twórca"): autor zamówienia oraz osoba, która je
    // zatwierdziła, jeśli to ktoś inny – tylko aktywni i z adresem e-mail.
    // Zatwierdzający dostaje mail w języku interfejsu (Accept-Language), autor – w języku swojego konta.
    // Klient (odbiorca spoza tenanta nadrzędnego) nie dostaje wiersza "Klient" – to jego własna firma.
    // Błędy wysyłki tylko logujemy: zamówienie jest już zatwierdzone i mail tego nie cofa.
    public async Task SendOrderSubmittedAsync(int orderId, CancellationToken ct = default)
    {
        List<Recipient> recipients;
        try
        {
            recipients = await GetSubmittedRecipientsAsync(orderId, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Zamówienie {OrderId}: nie udało się ustalić odbiorców potwierdzenia.", orderId);
            return;
        }

        if (recipients.Count == 0)
        {
            logger.LogWarning("Zamówienie {OrderId}: autor ani zatwierdzający nie mają adresu e-mail – potwierdzenie nie zostało wysłane.", orderId);
            return;
        }

        foreach (var group in recipients.GroupBy(r => (r.LanguageCode, r.IsMaster)))
        {
            var language = group.Key.LanguageCode;
            try
            {
                var order = await LoadOrderAsync(orderId, language, ct);
                if (order == null) return;

                var dict = await translations.GetAppDictionaryAsync(language, ct);
                var message = OrderEmailTemplate.Build(OrderEmailKind.Submitted, order, language,
                    (key, fallback) => dict.TryGetValue(key, out var text) && !string.IsNullOrWhiteSpace(text) ? text : fallback,
                    showClient: group.Key.IsMaster);

                foreach (var recipient in group)
                {
                    await SendAsync(recipient.Email, message, ct);
                    logger.LogInformation("Zamówienie {OrderId}: wysłano potwierdzenie ({Language}).", orderId, language);
                }
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Zamówienie {OrderId}: nie udało się wysłać potwierdzenia ({Language}).", orderId, language);
            }
        }
    }

    private async Task<List<Recipient>> GetSubmittedRecipientsAsync(int orderId, CancellationToken ct)
    {
        var recipients = new List<Recipient>();

        void Add(string? email, string languageCode, bool isMaster)
        {
            email = email?.Trim();
            if (string.IsNullOrEmpty(email)) return;
            if (recipients.Any(r => r.Email.Equals(email, StringComparison.OrdinalIgnoreCase))) return;
            recipients.Add(new Recipient(email, OrderEmailTemplate.NormalizeLanguage(languageCode), isMaster));
        }

        // Zatwierdzający = bieżący użytkownik
        if (userContext.UserId is int approverId)
        {
            var approver = await db.Users
                .AsNoTracking()
                .Where(u => u.UserId == approverId && u.IsActive)
                .Select(u => new
                {
                    u.Email,
                    IsMaster = db.Tenants.Where(t => t.TenantId == u.TenantId).Select(t => t.IsMaster).FirstOrDefault()
                })
                .FirstOrDefaultAsync(ct);
            if (approver != null) Add(approver.Email, userContext.LanguageCode, approver.IsMaster);
        }

        // Autor zamówienia (pomijany, jeśli to ta sama osoba / ten sam adres)
        var author = await db.Orders
            .AsNoTracking()
            .Where(o => o.OrderId == orderId && o.User!.IsActive)
            .Select(o => new
            {
                o.User!.Email,
                o.User.LanguageCode,
                IsMaster = db.Tenants.Where(t => t.TenantId == o.User.TenantId).Select(t => t.IsMaster).FirstOrDefault()
            })
            .FirstOrDefaultAsync(ct);
        if (author != null) Add(author.Email, author.LanguageCode, author.IsMaster);

        return recipients;
    }

    // Zamówienie z pozycjami w danym języku (nazwy artykułów i jednostek z tłumaczeń)
    private Task<OrderEmailData?> LoadOrderAsync(int orderId, string lang, CancellationToken ct) =>
        db.Orders
            .AsNoTracking()
            .Where(o => o.OrderId == orderId)
            .Select(o => new OrderEmailData
            {
                OrderNumber = o.OrderNumber,
                OrderDate = o.OrderDate,
                ClientCode = o.Tenant!.Code,
                ClientName = o.Tenant!.CompanyName,
                CreatedBy = o.User!.FirstName != null || o.User.LastName != null
                    ? ((o.User.FirstName ?? "") + " " + (o.User.LastName ?? "")).Trim()
                    : o.User.Login,
                Notes = o.Notes,
                ErpDocument = o.ERPDocName,
                Items = o.OrderItems
                    .OrderBy(i => i.OrderItemId)
                    .Select(i => new OrderEmailItem
                    {
                        ArticleCode = i.Article.Code,
                        ArticleName = i.Article.ArticlesTranslations
                            .Where(t => t.LanguageCode == lang)
                            .Select(t => t.Name)
                            .FirstOrDefault() ?? i.Article.Name,
                        Quantity = i.Quantity,
                        UnitName = i.Article.Unit != null
                            ? (i.Article.Unit.Translations
                                .Where(t => t.LanguageCode == lang)
                                .Select(t => t.Name)
                                .FirstOrDefault() ?? i.Article.Unit.InternalName)
                            : "",
                        DecimalPlaces = i.Article.Unit != null ? i.Article.Unit.DecimalPlaces : 0
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync(ct);

    private async Task SendAsync(string toEmail, OrderEmailMessage content, CancellationToken ct)
    {
        var message = new EmailMessage
        {
            From = _fromEmail,
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
}
