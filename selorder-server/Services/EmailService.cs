using System.Net;
using System.Net.Mail;

namespace Services;

public class EmailService(IConfiguration config)
{
    public async Task SendPasswordResetEmailAsync(string toEmail, string resetLink)
    {
        var settings = config.GetSection("SmtpSettings");

        var smtpClient = new SmtpClient(settings["Host"])
        {
            Port = int.Parse(settings["Port"]),
            Credentials = new NetworkCredential(settings["User"], settings["Password"]),
            EnableSsl = bool.Parse(settings["EnableSsl"]),
        };

        var mailMessage = new MailMessage
        {
            From = new MailAddress(settings["SenderEmail"], settings["SenderName"]),
            Subject = "Resetowanie hasła - SelOrder",
            Body = $@"
                <h2>Cześć!</h2>
                <p>Otrzymaliśmy prośbę o reset hasła.</p>
                <p>Kliknij poniższy link, aby ustawić nowe hasło (link ważny 1 godzinę):</p>
                <a href='{resetLink}'>ZRESETUJ HASŁO</a>
                <br/><br/>
                <p>Jeśli to nie Ty, zignoruj tę wiadomość.</p>",
            IsBodyHtml = true,
        };

        mailMessage.To.Add(toEmail);

        await smtpClient.SendMailAsync(mailMessage);
    }
}