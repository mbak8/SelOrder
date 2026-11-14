using Data;
using DTOs;
using Entities;
using Microsoft.EntityFrameworkCore;
using SelOrderServer.Extensions;

namespace Services;

public class OrderService(AppDbContext db, IAppUserContext userContext, OrderNumberGenerator numberGenerator)
{
    // Jedyny status, w którym zamówienie można edytować, zatwierdzić lub anulować
    private const OrderStatus EditableStatus = OrderStatus.InPreparation;

    // Strefa czasowa, wg której liczymy rok w numerze zamówienia (ZS/{KOD}/{ROK}/{NR})
    private static readonly TimeZoneInfo NumberingTimeZone = TimeZoneInfo.FindSystemTimeZoneById("Europe/Warsaw");

    // Tworzy nowe zamówienie (status "W opracowaniu") z pozycjami i od razu nadaje mu numer.
    // Zamówienie bez pozycji nie zostanie zapisane.
    public async Task<(OrderOperationResult Result, OrderCreatedDto? Created)> CreateOrderAsync(
        List<OrderItemInput>? items,
        string? notes,
        CancellationToken ct = default)
    {
        if (userContext.TenantId is not Guid tenantId || userContext.UserId is not int userId)
            throw new UnauthorizedAccessException("Brak kontekstu użytkownika.");

        // Tenant nadrzędny nie składa zamówień (ma tylko podgląd)
        if (userContext.IsMaster) return (OrderOperationResult.ReadOnly, null);

        var (validation, validItems) = await ValidateItemsAsync(items, ct);
        if (validation.Status != OrderOperationStatus.Ok) return (validation, null);

        var (notesValidation, normalizedNotes) = ValidateNotes(notes);
        if (notesValidation.Status != OrderOperationStatus.Ok) return (notesValidation, null);

        // Licznik i zamówienie w jednej transakcji – jeśli zapis się nie uda, numer nie przepada
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        // Data zamówienia zawsze w UTC. Rok do numeru liczymy wg czasu polskiego (niezależnie od strefy
        // serwera), żeby zamówienie z 1 stycznia po północy nie dostało numeru z poprzedniego roku.
        var orderDate = DateTimeOffset.UtcNow;
        var year = TimeZoneInfo.ConvertTime(orderDate, NumberingTimeZone).Year;
        var number = await numberGenerator.NextAsync(tenantId, year, ct);

        var order = new Order
        {
            TenantId = tenantId,
            UserId = userId,
            OrderDate = orderDate,
            OrderNumber = number,
            Status = OrderStatus.InPreparation,
            Notes = normalizedNotes,
            OrderItems = validItems
                .Select(i => new OrderItem { ArticleId = i.ArticleId, Quantity = i.Quantity })
                .ToList()
        };

        db.Orders.Add(order);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        return (OrderOperationResult.Ok, new OrderCreatedDto(order.OrderId, order.OrderNumber));
    }

    // Zapisuje pełną listę pozycji zamówienia (dodaje nowe, zmienia ilości, usuwa brakujące) oraz uwagi
    public async Task<OrderOperationResult> SaveItemsAsync(int orderId, List<OrderItemInput>? items, string? notes, CancellationToken ct = default)
    {
        if (userContext.IsMaster) return OrderOperationResult.ReadOnly;

        var (validation, validItems) = await ValidateItemsAsync(items, ct);
        if (validation.Status != OrderOperationStatus.Ok) return validation;

        var (notesValidation, normalizedNotes) = ValidateNotes(notes);
        if (notesValidation.Status != OrderOperationStatus.Ok) return notesValidation;

        var order = await db.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.OrderId == orderId && o.TenantId == userContext.TenantId, ct);

        if (order == null) return OrderOperationResult.NotFound;
        if (order.Status != EditableStatus) return OrderOperationResult.NotEditable;

        order.Notes = normalizedNotes;

        var wanted = validItems.ToDictionary(i => i.ArticleId, i => i.Quantity);

        // Usuwamy pozycje, których nie ma na nowej liście
        foreach (var item in order.OrderItems.Where(i => !wanted.ContainsKey(i.ArticleId)).ToList())
        {
            db.OrderItems.Remove(item);
        }

        // Aktualizujemy ilości istniejących i dodajemy nowe pozycje
        foreach (var (articleId, quantity) in wanted)
        {
            var existing = order.OrderItems.FirstOrDefault(i => i.ArticleId == articleId);
            if (existing != null)
                existing.Quantity = quantity;
            else
                order.OrderItems.Add(new OrderItem { ArticleId = articleId, Quantity = quantity });
        }

        await db.SaveChangesAsync(ct);
        return OrderOperationResult.Ok;
    }

    // Zatwierdzenie: 0 -> 5, tylko gdy zamówienie ma pozycje
    public async Task<OrderOperationResult> ApproveAsync(int orderId, CancellationToken ct = default)
    {
        if (userContext.IsMaster) return OrderOperationResult.ReadOnly;

        // Warunkowy UPDATE w jednym zapytaniu – chroni przed równoległą zmianą statusu w innej karcie
        var updated = await db.Orders
            .Where(o => o.OrderId == orderId
                     && o.TenantId == userContext.TenantId
                     && o.Status == EditableStatus
                     && o.OrderItems.Any())
            .ExecuteUpdateAsync(s => s
                .SetProperty(o => o.Status, OrderStatus.Approved)
                .SetProperty(o => o.StatusDescription, (string?)null), ct);

        return updated > 0 ? OrderOperationResult.Ok : await ExplainFailureAsync(orderId, ct);
    }

    // Anulowanie: 0 -> 3
    public async Task<OrderOperationResult> CancelAsync(int orderId, CancellationToken ct = default)
    {
        if (userContext.IsMaster) return OrderOperationResult.ReadOnly;

        var updated = await db.Orders
            .Where(o => o.OrderId == orderId
                     && o.TenantId == userContext.TenantId
                     && o.Status == EditableStatus)
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, OrderStatus.Cancelled), ct);

        return updated > 0 ? OrderOperationResult.Ok : await ExplainFailureAsync(orderId, ct);
    }

    public async Task<PagedResult<OrderDto>> GetOrdersPagedAsync(
        int pageNumber,
        int pageSize,
        Dictionary<string, string> filters,
        CancellationToken ct = default)
    {
        var userLanguage = userContext.LanguageCode ?? "PL";
        var tenantId = userContext.TenantId;
        var isMaster = userContext.IsMaster;

        // 1. Podstawowe filtrowanie bezpieczeństwa
        // Użytkownik widzi wszystkie zamówienia swojego Tenanta (Firmy),
        // a użytkownik tenanta nadrzędnego - zamówienia wszystkich klientów (tylko podgląd)
        var query = db.Orders
            .AsNoTracking()
            .Where(o => isMaster || o.TenantId == tenantId)
            .AsQueryable();

        // 2a. Filtr po kliencie (kod lub nazwa firmy) - to nie jest pole zamówienia,
        //     więc obsługujemy go osobno i nie przekazujemy do filtrów dynamicznych
        var clientKey = filters.Keys.FirstOrDefault(k => k.Equals("clientName", StringComparison.OrdinalIgnoreCase));
        if (clientKey != null)
        {
            var client = filters[clientKey].Trim();
            filters = filters.Where(f => f.Key != clientKey).ToDictionary(f => f.Key, f => f.Value);

            if (client.Length > 0)
            {
                query = query.Where(o => o.Tenant!.Code.Contains(client) || o.Tenant!.CompanyName.Contains(client));
            }
        }

        // 2b. Dynamiczne filtry (z naszego Extension Method)
        query = query.ApplyDynamicFilters(filters);

        int totalCount = await query.CountAsync(ct);

        // 3. Sortowanie po numerze zamówienia malejąco (najnowsze na górze).
        // Nie sortujemy po tekście OrderNumber, bo "ZS/AGRO/2026/1000" < "ZS/AGRO/2026/999".
        // OrderId rośnie w tej samej kolejności co numer: numer jest pobierany z licznika
        // w tej samej transakcji co INSERT, a licznik jest zablokowany do jej końca.
        query = query.OrderByDescending(o => o.OrderId);

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
            o.StatusDescription,
            o.Status == EditableStatus && !isMaster,
            o.Tenant!.Code,
            o.Tenant!.CompanyName
        )).ToListAsync(ct);

        return new PagedResult<OrderDto>(items, totalCount, pageSize, pageNumber);
    }

    public async Task<OrderDetailDto?> GetOrderByIdAsync(int orderId, CancellationToken ct = default)
    {
        var userLanguage = userContext.LanguageCode ?? "PL";
        var tenantId = userContext.TenantId;
        var isMaster = userContext.IsMaster;

        // Jedna projekcja w SQL: nagłówek + pozycje z tłumaczeniami artykułów i jednostek
        return await db.Orders
            .AsNoTracking()
            .Where(o => o.OrderId == orderId && (isMaster || o.TenantId == tenantId))
            .Select(o => new OrderDetailDto(
                o.OrderId,
                o.OrderNumber,
                o.OrderDate,
                (int)o.Status,
                db.AppTranslations
                    .Where(t => t.LanguageCode == userLanguage && t.TranslationKey == "Order.Status." + (int)o.Status)
                    .Select(t => t.TranslatedText)
                    .FirstOrDefault() ?? o.Status.ToString(),
                o.ERPDocName,
                o.Status == EditableStatus && !isMaster,
                o.Tenant!.Code,
                o.Tenant!.CompanyName,
                o.Notes,
                o.OrderItems
                    .OrderBy(i => i.OrderItemId)
                    .Select(i => new OrderItemDto(
                        i.OrderItemId,
                        i.ArticleId,
                        i.Article.Code,
                        i.Article.ArticlesTranslations
                            .Where(t => t.LanguageCode == userLanguage)
                            .Select(t => t.Name)
                            .FirstOrDefault() ?? i.Article.Name,
                        i.Quantity,
                        // Jednostka (z tłumaczeniem lub InternalName)
                        i.Article.Unit != null
                            ? (i.Article.Unit.Translations
                                .Where(t => t.LanguageCode == userLanguage)
                                .Select(t => t.Name)
                                .FirstOrDefault() ?? i.Article.Unit.InternalName)
                            : "",
                        i.Article.Unit != null ? i.Article.Unit.DecimalPlaces : 0
                    ))
                    .ToList()
            ))
            .FirstOrDefaultAsync(ct);
    }

    // Walidacja pozycji: niepusta lista, dodatnie ilości zgodne z jednostką, istniejące artykuły.
    // Duplikaty tego samego artykułu są sumowane do jednej pozycji.
    private async Task<(OrderOperationResult Result, List<OrderItemInput> Items)> ValidateItemsAsync(
        List<OrderItemInput>? items,
        CancellationToken ct)
    {
        if (items == null || items.Count == 0)
            return (OrderOperationResult.Invalid("NoItems", "Zamówienie musi mieć co najmniej jedną pozycję."), []);

        if (items.Any(i => i.Quantity <= 0))
            return (OrderOperationResult.Invalid("InvalidQuantity", "Ilość musi być większa od zera."), []);

        var merged = items
            .GroupBy(i => i.ArticleId)
            .Select(g => new OrderItemInput(g.Key, g.Sum(i => i.Quantity)))
            .ToList();

        var articleIds = merged.Select(i => i.ArticleId).ToList();
        var decimalPlaces = await db.Articles
            .Where(a => articleIds.Contains(a.ArticleId))
            .Select(a => new { a.ArticleId, DecimalPlaces = a.Unit != null ? a.Unit.DecimalPlaces : 0 })
            .ToDictionaryAsync(a => a.ArticleId, a => a.DecimalPlaces, ct);

        if (decimalPlaces.Count != merged.Count)
            return (OrderOperationResult.Invalid("InvalidArticle", "Zamówienie zawiera nieistniejący artykuł."), []);

        // Ilość nie może mieć więcej miejsc po przecinku niż pozwala jednostka (i kolumna decimal(18,4))
        foreach (var item in merged)
        {
            var places = Math.Min(decimalPlaces[item.ArticleId], 4);
            if (decimal.Round(item.Quantity, places) != item.Quantity)
                return (OrderOperationResult.Invalid("InvalidQuantity", "Ilość ma za dużo miejsc po przecinku dla tej jednostki."), []);
        }

        return (OrderOperationResult.Ok, merged);
    }

    // Uwagi: przycinamy spacje, pusty tekst = brak uwag, limit długości jak kolumna w bazie
    private static (OrderOperationResult Result, string? Notes) ValidateNotes(string? notes)
    {
        var trimmed = string.IsNullOrWhiteSpace(notes) ? null : notes.Trim();

        if (trimmed != null && trimmed.Length > Order.NotesMaxLength)
            return (OrderOperationResult.Invalid("NotesTooLong", $"Uwagi mogą mieć najwyżej {Order.NotesMaxLength} znaków."), null);

        return (OrderOperationResult.Ok, trimmed);
    }

    // Ustala, dlaczego warunkowa zmiana statusu nie objęła żadnego wiersza
    private async Task<OrderOperationResult> ExplainFailureAsync(int orderId, CancellationToken ct)
    {
        var order = await db.Orders
            .AsNoTracking()
            .Where(o => o.OrderId == orderId && o.TenantId == userContext.TenantId)
            .Select(o => new { o.Status, HasItems = o.OrderItems.Any() })
            .FirstOrDefaultAsync(ct);

        if (order == null) return OrderOperationResult.NotFound;
        if (order.Status != EditableStatus) return OrderOperationResult.NotEditable;
        if (!order.HasItems)
            return OrderOperationResult.Invalid("NoItems", "Zamówienie musi mieć co najmniej jedną pozycję.");

        // Status zmienił się między zapytaniami (np. równoległa operacja w innej karcie)
        return OrderOperationResult.NotEditable;
    }
}

public enum OrderOperationStatus
{
    Ok,
    NotFound,
    Conflict,
    Invalid,
    Forbidden
}

// Wynik operacji na zamówieniu. Code trafia do klienta i służy jako klucz tłumaczenia (Order.Error.{Code}).
public record OrderOperationResult(OrderOperationStatus Status, string? Code = null, string? Message = null)
{
    public static readonly OrderOperationResult Ok = new(OrderOperationStatus.Ok);
    public static readonly OrderOperationResult NotFound = new(OrderOperationStatus.NotFound);
    public static readonly OrderOperationResult NotEditable =
        new(OrderOperationStatus.Conflict, "NotEditable", "Zamówienie można zmieniać tylko w statusie \"W opracowaniu\".");
    public static readonly OrderOperationResult ReadOnly =
        new(OrderOperationStatus.Forbidden, "ReadOnly", "Masz dostęp do zamówień tylko w trybie podglądu.");

    public static OrderOperationResult Invalid(string code, string message) =>
        new(OrderOperationStatus.Invalid, code, message);

    // Mapowanie na odpowiedź HTTP
    public IResult ToHttpResult() => Status switch
    {
        OrderOperationStatus.Ok => Results.NoContent(),
        OrderOperationStatus.NotFound => Results.NotFound(),
        OrderOperationStatus.Conflict => Results.Conflict(new { code = Code, message = Message }),
        OrderOperationStatus.Forbidden => Results.Json(new { code = Code, message = Message }, statusCode: StatusCodes.Status403Forbidden),
        _ => Results.BadRequest(new { code = Code, message = Message })
    };
}
