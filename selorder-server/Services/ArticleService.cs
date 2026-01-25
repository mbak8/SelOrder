using Microsoft.EntityFrameworkCore;
using SelOrderServer.Extensions;
using Data;
using DTOs;

namespace Services;

public class ArticleService(AppDbContext db, IAppUserContext userContext)
{
    /*
    public async Task<List<ArticleDto>> GetAllArticlesAsync(CancellationToken ct = default)
    {
        // 1. Pobieramy kod języka zalogowanego użytkownika (lub domyślny "PL")
        var userLanguage = userContext.LanguageCode ?? "PL";

        // 2. Budujemy zapytanie
        var query = db.Articles
            .AsNoTracking() // Tylko do odczytu -> szybciej
            .Select(a => new ArticleDto(
                a.ArticleId,
                a.Code,
                a.Name,
                a.ERPId,

                // Obsługa NULL-i w ilościach (Coalesce w SQL)
                a.QuantityAvailable ?? 0m,
                a.QuantityReserved ?? 0m,

                // Kod jednostki (zabezpieczenie gdyby Unit był null)
                a.Unit != null ? a.Unit.Code : "",

                // LOGIKA TŁUMACZENIA (Subquery w SQL):
                // "Spróbuj znaleźć tłumaczenie dla mojego języka. 
                //  Jak nie ma, użyj nazwy technicznej (InternalName)."
                a.Unit != null
                    ? (a.Unit.Translations
                        .Where(t => t.LanguageCode == userLanguage)
                        .Select(t => t.Name)
                        .FirstOrDefault() ?? a.Unit.InternalName)
                    : "",

                // Miejsca po przecinku
                a.Unit != null ? a.Unit.DecimalPlaces : 0
            ));

        // 3. Wykonanie zapytania SQL
        return await query.ToListAsync(ct);
    }
    */


    public async Task<PagedResult<ArticleDto>> GetArticlesPagedAsync(
    int pageNumber,
    int pageSize,
    Dictionary<string, string> filters,
    CancellationToken ct = default)
    {
        var userLanguage = userContext.LanguageCode ?? "PL";
        var query = db.Articles.AsNoTracking().AsQueryable();

        // 1. Filtrowanie (bez zmian)
        query = query.ApplyDynamicFilters(filters);

        int totalCount = await query.CountAsync(ct);

        // 2. Sortowanie (bez zmian)
        query = query.OrderBy(a => a.Code);

        // 3. --- ZMIANA: Logika "Wyłącz Stronicowanie" ---
        // Jeśli pageSize > 0 -> tniemy na strony.
        // Jeśli pageSize == -1 -> bierzemy wszystko.
        if (pageSize > 0)
        {
            query = query
                .Skip((pageNumber - 1) * pageSize)
                .Take(pageSize);
        }

        // 4. Projekcja (Select) i pobranie danych
        var items = await query
            .Select(a => new ArticleDto(
                 // ... Twoje mapowanie pól (bez zmian) ...
                 a.ArticleId, a.Code, a.Name, a.ERPId,
                 a.QuantityAvailable ?? 0m, a.QuantityReserved ?? 0m,
                 a.Unit != null ? a.Unit.Code : "",
                 a.Unit != null
                     ? (a.Unit.Translations.Where(t => t.LanguageCode == userLanguage).Select(t => t.Name).FirstOrDefault() ?? a.Unit.InternalName)
                     : "",
                 a.Unit != null ? a.Unit.DecimalPlaces : 0
            ))
            .ToListAsync(ct);

        return new PagedResult<ArticleDto>(items, totalCount, pageSize, pageNumber);
    }
}