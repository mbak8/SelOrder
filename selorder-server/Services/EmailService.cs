using System.Net;
using Resend;

namespace Services;

public class EmailService(IResend resend, IConfiguration config, TranslationService translations)
{
    private readonly string _fromEmail = config["EmailSettings:From"] ?? string.Empty;

    // Mail z linkiem do resetu hasła, w języku wybranym w oknie resetu hasła (Accept-Language żądania).
    // Teksty z AppTranslations (klucze Email.PasswordReset.*, sql/password-reset-email-translations.sql);
    // gdy brakuje tłumaczenia – polski tekst z kodu.
    public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink, string languageCode, CancellationToken ct = default)
    {
        var lang = string.IsNullOrWhiteSpace(languageCode) ? "PL" : languageCode.Trim().ToUpperInvariant();
        var dict = await translations.GetAppDictionaryAsync(lang, ct);

        string T(string key, string fallback) =>
            dict.TryGetValue(key, out var text) && !string.IsNullOrWhiteSpace(text) ? text : fallback;
        string H(string key, string fallback) => WebUtility.HtmlEncode(T(key, fallback));

        var message = new EmailMessage();
        message.From = _fromEmail;
        message.To.Add(toEmail);
        message.Subject = T("Email.PasswordReset.Subject", "Resetowanie hasła - SelOrder");
        message.HtmlBody = $@"
                <div lang='{lang.ToLowerInvariant()}'>
                <h2>{H("Email.PasswordReset.Greeting", "Cześć!")}</h2>
                <p>{H("Email.PasswordReset.Intro", "Otrzymaliśmy prośbę o reset hasła.")}</p>
                <p>{H("Email.PasswordReset.Instruction", "Kliknij poniższy link, aby ustawić nowe hasło (link ważny 1 godzinę):")}</p>
                <a href='{WebUtility.HtmlEncode(resetLink)}'>{H("Email.PasswordReset.Button", "ZRESETUJ HASŁO")}</a>
                <br/><br/>
                <p>{H("Email.PasswordReset.Ignore", "Jeśli to nie Ty, zignoruj tę wiadomość.")}</p>
                </div>";
        await resend.EmailSendAsync(message, ct);
    }
}
