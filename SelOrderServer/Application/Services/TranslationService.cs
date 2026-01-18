using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Hybrid;
using SelOrderServer.Infrastructure.Auth;
using SelOrderServer.Infrastructure.Data;

namespace SelOrderServer.Application.Services;

public class TranslationService(
    HybridCache cache,
    IServiceScopeFactory scopeFactory,
    IAppUserContext userContext)
{
    // Ta metoda automatycznie używa języka przypisanego do Usera!
    public async Task<string> GetUnitNameAsync(int unitId, CancellationToken ct = default)
    {
        string lang = userContext.LanguageCode; // Np. "EN" z Tokena
        string key = $"unit:{unitId}:{lang}";

        return await cache.GetOrCreateAsync(key, async token =>
        {
            // Tworzymy scope dla DbContextu (bo Cache jest Singletonem)
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Pobierz tłumaczenie
            var text = await db.UnitTranslations
                .Where(t => t.UnitId == unitId && t.LanguageCode == lang)
                .Select(t => t.Name)
                .FirstOrDefaultAsync(token);

            // Fallback (jeśli brak tłumaczenia, zwróć cokolwiek, np. ID)
            return text ?? $"Unit #{unitId}";
        },
        tags: ["translations"], // Tagi do inwalidacji cache
        cancellationToken: ct);
    }

    // NOWA METODA: Pobiera cały słownik aplikacji dla zalogowanego języka
    public async Task<Dictionary<string, string>> GetAppDictionaryAsync(CancellationToken ct = default)
    {
        string lang = userContext.LanguageCode; // np. "PL"
        string cacheKey = $"app-dict-{lang}";

        return await cache.GetOrCreateAsync(cacheKey, async token =>
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Pobieramy wszystkie teksty dla danego języka i zamieniamy w Słownik (Key -> Value)
            return await db.AppTranslations
                .Where(t => t.LanguageCode == lang)
                .ToDictionaryAsync(t => t.TranslationKey, t => t.TranslatedText, token);
        },
        tags: ["translations"],
        cancellationToken: ct);
    }
}