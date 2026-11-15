// Wspólny szablon maili o zamówieniach (nagłówek + tabelka pozycji).
// Plik jest dołączany jako link do selorder-server i selorder-integration (<Compile Include=... Link=...>),
// więc nie może zależeć od niczego poza samym .NET – dane i tłumaczenia podaje wywołujący.
// Teksty: klucze Email.Order.* w AppTranslations (sql/order-email-translations.sql), polski jako fallback.

using System.Globalization;
using System.Net;
using System.Text;

namespace SelOrder.Shared.Email;

public enum OrderEmailKind
{
    Submitted,    // Potwierdzenie zatwierdzenia – do twórcy (selorder-server)
    Exported,     // Wyeksportowane do ERP – do adminów i superadmina (selorder-integration)
    ExportFailed  // Błąd eksportu – do superadmina (selorder-integration)
}

public class OrderEmailItem
{
    public string ArticleCode { get; set; } = "";
    public string ArticleName { get; set; } = "";
    public decimal Quantity { get; set; }
    public string UnitName { get; set; } = "";
    public int DecimalPlaces { get; set; }
}

public class OrderEmailData
{
    public string OrderNumber { get; set; } = "";
    public DateTimeOffset OrderDate { get; set; }
    public string ClientCode { get; set; } = "";
    public string ClientName { get; set; } = "";
    public string? CreatedBy { get; set; }
    public string? Notes { get; set; }
    public string? ErpDocument { get; set; }
    public List<OrderEmailItem> Items { get; set; } = [];
}

// Obrazek osadzony w mailu (inline, CID) – wysyłający dołącza go jako załącznik z ContentId,
// a HTML odwołuje się do niego przez src='cid:{ContentId}'.
public sealed record OrderEmailInlineImage(string ContentId, string FileName, string ContentType, byte[] Content);

public sealed record OrderEmailMessage(string Subject, string HtmlBody, IReadOnlyList<OrderEmailInlineImage> InlineImages);

public static class OrderEmailTemplate
{
    // Daty w mailu pokazujemy w czasie polskim (w bazie są w UTC)
    private static readonly TimeZoneInfo DisplayTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Warsaw");

    // Logo w nagłówku maila: selorder-shared/Email/agroselnet-logo.png (480x55, wyświetlane w połowie rozmiaru –
    // ostre na ekranach o dużej gęstości). Każdy projekt dołącza je jako EmbeddedResource z tą LogicalName.
    // Gdy zasobu brak, mail wychodzi bez logo.
    private const string LogoResourceName = "SelOrder.Shared.Email.agroselnet-logo.png";
    private static readonly Lazy<OrderEmailInlineImage?> Logo = new(LoadLogo);

    // t(klucz, polski fallback) – tłumaczenie w języku odbiorcy.
    // errorMessage – treść błędu, pokazywana tylko w mailu ExportFailed.
    // showClient – wiersz "Klient"; false dla odbiorców spoza tenanta nadrzędnego (klient wie, kim jest).
    public static OrderEmailMessage Build(
        OrderEmailKind kind,
        OrderEmailData order,
        string languageCode,
        Func<string, string, string> t,
        string? errorMessage = null,
        bool showClient = true)
    {
        var lang = NormalizeLanguage(languageCode);
        var culture = CultureFor(lang);

        string H(string text) => WebUtility.HtmlEncode(text);
        string L(string key, string fallback) => H(t(key, fallback));

        var (subjectFallback, introFallback) = kind switch
        {
            OrderEmailKind.Submitted => ("Potwierdzenie zamówienia {0}", "Zamówienie zostało zatwierdzone. Poniżej jego szczegóły."),
            OrderEmailKind.Exported => ("Zamówienie {0} wyeksportowane do ERP", "Zamówienie zostało wyeksportowane do systemu ERP."),
            OrderEmailKind.ExportFailed => ("Błąd eksportu zamówienia {0}", "Eksport zamówienia do systemu ERP nie powiódł się."),
            _ => throw new ArgumentOutOfRangeException(nameof(kind))
        };

        // {0} podmieniamy przez Replace, nie string.Format – tłumaczenie z innym nawiasem klamrowym nie wywali wysyłki
        var subject = t($"Email.Order.{kind}.Subject", subjectFallback).Replace("{0}", order.OrderNumber);
        var orderDate = TimeZoneInfo.ConvertTime(order.OrderDate, DisplayTimeZone).ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);

        var html = new StringBuilder();
        html.Append($"<div lang='{lang.ToLowerInvariant()}' style='font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#333333;'>");
        var logo = Logo.Value;
        if (logo != null)
            html.Append($"<img src='cid:{logo.ContentId}' width='240' height='28' alt='AgroSelNet' style='display:block;border:0;outline:none;margin:0 0 20px 0;'/>");
        html.Append($"<p>{L($"Email.Order.{kind}.Intro", introFallback)}</p>");

        if (kind == OrderEmailKind.ExportFailed && !string.IsNullOrWhiteSpace(errorMessage))
        {
            html.Append("<p style='padding:10px 12px;background:#ffebee;color:#b71c1c;border-radius:4px;'>");
            html.Append($"<strong>{L("Email.Order.Error", "Treść błędu")}:</strong><br/>{MultiLine(errorMessage)}</p>");
        }

        // Nagłówek zamówienia
        html.Append("<table cellpadding='0' cellspacing='0' style='border-collapse:collapse;margin:16px 0;'>");
        HeaderRow(html, L("Email.Order.Number", "Numer zamówienia"), H(order.OrderNumber));
        HeaderRow(html, L("Email.Order.Date", "Data zamówienia"), H(orderDate));
        if (showClient)
            HeaderRow(html, L("Email.Order.Client", "Klient"), H($"{order.ClientCode} – {order.ClientName}"));
        if (!string.IsNullOrWhiteSpace(order.CreatedBy))
            HeaderRow(html, L("Email.Order.CreatedBy", "Autor"), H(order.CreatedBy));
        if (!string.IsNullOrWhiteSpace(order.ErpDocument))
            HeaderRow(html, L("Email.Order.ErpDocument", "Dokument ERP"), H(order.ErpDocument));
        if (!string.IsNullOrWhiteSpace(order.Notes))
            HeaderRow(html, L("Email.Order.Notes", "Uwagi"), MultiLine(order.Notes));
        html.Append("</table>");

        // Pozycje
        const string th = "padding:8px 10px;text-align:left;font-weight:bold;white-space:nowrap;";
        const string td = "padding:6px 10px;border-bottom:1px solid #e0e0e0;vertical-align:top;";
        html.Append("<table cellpadding='0' cellspacing='0' style='border-collapse:collapse;width:100%;max-width:720px;'>");
        html.Append("<tr style='background:#2e7d32;color:#ffffff;'>");
        html.Append($"<th style='{th}'>{L("Email.Order.Items.No", "Lp.")}</th>");
        html.Append($"<th style='{th}'>{L("Email.Order.Items.Code", "Kod")}</th>");
        html.Append($"<th style='{th}'>{L("Email.Order.Items.Name", "Nazwa")}</th>");
        html.Append($"<th style='{th}text-align:right;'>{L("Email.Order.Items.Quantity", "Ilość")}</th>");
        html.Append($"<th style='{th}'>{L("Email.Order.Items.Unit", "J.m.")}</th>");
        html.Append("</tr>");

        var no = 0;
        foreach (var item in order.Items)
        {
            no++;
            var places = Math.Clamp(item.DecimalPlaces, 0, 4);
            html.Append("<tr>");
            html.Append($"<td style='{td}'>{no}</td>");
            html.Append($"<td style='{td}white-space:nowrap;'>{H(item.ArticleCode)}</td>");
            html.Append($"<td style='{td}'>{H(item.ArticleName)}</td>");
            html.Append($"<td style='{td}text-align:right;white-space:nowrap;'>{H(item.Quantity.ToString("N" + places, culture))}</td>");
            html.Append($"<td style='{td}'>{H(item.UnitName)}</td>");
            html.Append("</tr>");
        }
        html.Append("</table>");

        html.Append($"<p style='margin-top:24px;color:#888888;font-size:12px;'>{L("Email.Order.Footer", "Wiadomość wygenerowana automatycznie przez SelOrder – prosimy na nią nie odpowiadać.")}</p>");
        html.Append("</div>");

        return new OrderEmailMessage(subject, html.ToString(), logo != null ? [logo] : []);
    }

    private static OrderEmailInlineImage? LoadLogo()
    {
        using var stream = typeof(OrderEmailTemplate).Assembly.GetManifestResourceStream(LogoResourceName);
        if (stream == null) return null;
        using var buffer = new MemoryStream();
        stream.CopyTo(buffer);
        return new OrderEmailInlineImage("selorder-logo", "agroselnet-logo.png", "image/png", buffer.ToArray());
    }

    public static string NormalizeLanguage(string? languageCode) =>
        string.IsNullOrWhiteSpace(languageCode) ? "PL" : languageCode.Trim().ToUpperInvariant();

    private static CultureInfo CultureFor(string lang) => lang switch
    {
        "EN" => CultureInfo.GetCultureInfo("en-GB"),
        "DE" => CultureInfo.GetCultureInfo("de-DE"),
        "RU" => CultureInfo.GetCultureInfo("ru-RU"),
        _ => CultureInfo.GetCultureInfo("pl-PL")
    };

    private static void HeaderRow(StringBuilder html, string label, string valueHtml) =>
        html.Append("<tr>")
            .Append($"<td style='padding:3px 16px 3px 0;color:#666666;vertical-align:top;white-space:nowrap;'>{label}</td>")
            .Append($"<td style='padding:3px 0;font-weight:bold;'>{valueHtml}</td>")
            .Append("</tr>");

    // Tekst wielowierszowy (uwagi, treść błędu): kodowanie HTML + <br/> zamiast nowych linii
    private static string MultiLine(string text) =>
        WebUtility.HtmlEncode(text.Trim()).ReplaceLineEndings("<br/>");
}
