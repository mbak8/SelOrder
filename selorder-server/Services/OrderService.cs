using Data;
using DTOs;
using Microsoft.EntityFrameworkCore;
using SelOrderServer.Extensions;

namespace Services;

public class OrderService(AppDbContext db, IAppUserContext userContext)
{
    public async Task<PagedResult<OrderDto>> GetOrdersPagedAsync(
        int pageNumber,
        int pageSize,
        Dictionary<string, string> filters,
        CancellationToken ct = default)
    {
        var userLanguage = userContext.LanguageCode ?? "PL";

        // 1. Podstawowe filtrowanie bezpieczeństwa
        // Użytkownik widzi tylko zamówienia swojego Tenanta (Firma)
        // Oraz tylko swoje własne (UserId) - chyba że jest Managerem (to logika na później)
        var query = db.Orders
            .AsNoTracking()
            .Where(o => o.TenantId == userContext.TenantId && o.UserId == userContext.UserId)
            .AsQueryable();

        // 2. Dynamiczne filtry (z naszego Extension Method)
        query = query.ApplyDynamicFilters(filters);

        int totalCount = await query.CountAsync(ct);

        // 3. Sortowanie (Domyślnie od najnowszych)
        query = query.OrderByDescending(o => o.OrderDate);

        // 4. Stronicowanie (Obsługa pobierania wszystkiego przy -1)
        if (pageSize > 0)
        {
            query = query.Skip((pageNumber - 1) * pageSize).Take(pageSize);
        }

        // 5. Projekcja z tłumaczeniem statusu w locie
        var items = await query.Select(o => new OrderDto(
            o.OrderId,
            o.OrderNumber,
            o.OrderDate,
            (int)o.Status, // Rzutowanie Enum na int

            // Tłumaczenie statusu: Szukamy klucza "Order.Status.0", "Order.Status.5" itd.
            db.AppTranslations
                .Where(t => t.LanguageCode == userLanguage && t.TranslationKey == "Order.Status." + (int)o.Status)
                .Select(t => t.TranslatedText)
                .FirstOrDefault() ?? o.Status.ToString(), // Fallback: nazwa z enuma (np. "Approved")

            o.ERPDocName,
            o.StatusDescription
        )).ToListAsync(ct);

        return new PagedResult<OrderDto>(items, totalCount, pageSize, pageNumber);
    }

    public async Task<OrderDetailDto?> GetOrderByIdAsync(int orderId, CancellationToken ct = default)
    {
        var userLanguage = userContext.LanguageCode ?? "PL";

        var order = await db.Orders
            .AsNoTracking()
            // Ważne: Joinujemy pozycje, a w pozycjach artykuły, a w artykułach jednostki
            .Include(o => o.OrderItems)
                .ThenInclude(i => i.Article)
                    .ThenInclude(a => a.Unit)
            .Include(o => o.OrderItems)
                .ThenInclude(i => i.Article)
                    .ThenInclude(a => a.Unit!.Translations) // Do tłumaczenia jednostek
            .FirstOrDefaultAsync(o => o.OrderId == orderId && o.TenantId == userContext.TenantId, ct);

        if (order == null) return null;

        // Tłumaczenie statusu (ta sama logika co na liście)
        var statusName = await db.AppTranslations
            .Where(t => t.LanguageCode == userLanguage && t.TranslationKey == "Order.Status." + (int)order.Status)
            .Select(t => t.TranslatedText)
            .FirstOrDefaultAsync(ct) ?? order.Status.ToString();

        // Mapowanie na DTO
        return new OrderDetailDto(
            order.OrderId,
            order.OrderNumber,
            order.OrderDate,
            (int)order.Status,
            statusName,
            order.ERPDocName,
            order.OrderItems.Select(i => new OrderItemDto(
                i.OrderItemId,
                i.ArticleId,
                i.Article.Code,
                i.Article.Name,
                i.Quantity,
                // Pobieranie jednostki (z tłumaczeniem lub InternalName)
                i.Article.Unit != null
                    ? (i.Article.Unit.Translations.FirstOrDefault(t => t.LanguageCode == userLanguage)?.Name ?? i.Article.Unit.InternalName)
                    : ""
            )).ToList()
        );
    }
}