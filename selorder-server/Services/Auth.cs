using System.Security.Claims;

namespace Services;

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

    // NOWY PRIORYTET JĘZYKA:
    // 1. Nagłówek HTTP z Reacta (najwyższy priorytet - reaguje na zmiany w locie)
    // 2. Zapisany w Tokenie (fallback, gdyby React z jakiegoś powodu nie wysłał nagłówka)
    // 3. Default "PL"
    public string LanguageCode
    {
        get
        {
            // 1. Sprawdź nagłówek przeglądarki (w Axios ustawiliśmy Accept-Language)
            var headerLang = httpContextAccessor.HttpContext?.Request.GetTypedHeaders()
                .AcceptLanguage?.FirstOrDefault()?.Value.Value;

            if (!string.IsNullOrEmpty(headerLang) && headerLang.Length >= 2)
            {
                // Zabezpieczenie na wypadek języków typu "en-US" -> bierzemy "EN"
                return headerLang[..2].ToUpper();
            }

            // 2. Sprawdź JWT (jeśli brak nagłówka)
            var claimLang = _user?.FindFirst("Language")?.Value;
            if (!string.IsNullOrEmpty(claimLang))
            {
                return claimLang;
            }

            // 3. Domyślny fallback
            return "PL";
        }
    }
}