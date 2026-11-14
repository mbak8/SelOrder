using Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;

namespace Services;


public class TranslationService(
    HybridCache cache,
    IServiceScopeFactory scopeFactory,
    IAppUserContext userContext)
{
    // ... (metoda GetUnitNameAsync bez zmian) ...

    // ZMIANA TUTAJ: Dodajemy parametr 'string? requestedLang = null'
    public async Task<Dictionary<string, string>> GetAppDictionaryAsync(string? requestedLang = null, CancellationToken ct = default)
    {
        // LOGIKA: Jeśli frontend podał język, użyj go. Jeśli nie, weź z tokena.
        // Jeśli nawet w tokenie jest null (niezalogowany), użyj domyślnego "PL".
        string lang = !string.IsNullOrEmpty(requestedLang)
                      ? requestedLang
                      : (userContext.LanguageCode ?? "PL");

        string cacheKey = $"app-dict-{lang}";

        return await cache.GetOrCreateAsync(cacheKey, async token =>
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            return await db.AppTranslations
                .Where(t => t.LanguageCode == lang)
                .ToDictionaryAsync(t => t.TranslationKey, t => t.TranslatedText, token);
        },
        tags: ["translations"],
        cancellationToken: ct);
    }
}