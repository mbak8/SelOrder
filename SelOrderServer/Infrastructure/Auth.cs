using System.Security.Claims;

namespace SelOrderServer.Infrastructure.Auth;

public interface IAppUserContext
{
    int? TenantId { get; }
    int? UserId { get; }
    string LanguageCode { get; }
    bool IsAuthenticated { get; }
}

// Primary Constructor
public class AppUserContext(IHttpContextAccessor httpContextAccessor) : IAppUserContext
{
    private readonly ClaimsPrincipal? _user = httpContextAccessor.HttpContext?.User;

    public bool IsAuthenticated => _user?.Identity?.IsAuthenticated ?? false;

    // Pobieramy TenantId z Tokena JWT. 
    // Jeśli usera nie ma, null.
    public int? TenantId =>
        int.TryParse(_user?.FindFirst("TenantId")?.Value, out var id) ? id : null;

    public int? UserId =>
        int.TryParse(_user?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var id) ? id : null;

    // Priorytet języka:
    // 1. Zapisany w Tokenie (User z bazy)
    // 2. Nagłówek HTTP (Dla niezalogowanych)
    // 3. Default "PL"
    public string LanguageCode
    {
        get
        {
            // 1. Sprawdź JWT
            var claimLang = _user?.FindFirst("Language")?.Value;
            if (!string.IsNullOrEmpty(claimLang)) return claimLang;

            // 2. Sprawdź nagłówek przeglądarki
            var headerLang = httpContextAccessor.HttpContext?.Request.GetTypedHeaders()
                .AcceptLanguage?.FirstOrDefault()?.Value.Value;

            if (!string.IsNullOrEmpty(headerLang) && headerLang.Length >= 2)
                return headerLang[..2].ToUpper();

            return "PL";
        }
    }
}