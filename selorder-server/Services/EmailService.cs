using Resend;

namespace Services;

public class EmailService(IResend resend, IConfiguration config)
{
    private readonly string _fromEmail = config["EmailSettings:From"] ?? string.Empty;

    public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink)
    {
        var message = new EmailMessage();
        message.From = _fromEmail;
        message.To.Add(toEmail);
        message.Subject = "Resetowanie hasła - SelOrder";
        message.HtmlBody = $@"
                <h2>Cześć!</h2>
                <p>Otrzymaliśmy prośbę o reset hasła.</p>
                <p>Kliknij poniższy link, aby ustawić nowe hasło (link ważny 1 godzinę):</p>
                <a href='{resetLink}'>ZRESETUJ HASŁO</a>
                <br/><br/>
                <p>Jeśli to nie Ty, zignoruj tę wiadomość.</p>";
        await resend.EmailSendAsync(message);
    }
}