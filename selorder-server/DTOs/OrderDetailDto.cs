namespace DTOs;

// Pojedynczy wiersz (pozycja)
public record OrderItemDto(
    int OrderItemId,
    int ArticleId,
    string ArticleCode,  // Z tabeli Articles
    string ArticleName,  // Z tabeli Articles (przetłumaczona, jeśli jest tłumaczenie)
    decimal Quantity,
    string UnitCode,     // Z tabeli Units (przez Article)
    int DecimalPlaces    // Dopuszczalna liczba miejsc po przecinku dla ilości (z jednostki)
);

// Całe zamówienie (Nagłówek + Lista)
public record OrderDetailDto(
    int OrderId,
    string OrderNumber,
    DateTimeOffset OrderDate, // Zawsze UTC (+00:00); klient przelicza na czas lokalny
    int StatusId,
    string StatusName,
    string? ERPDocument,
    bool IsEditable,     // Czy zamówienie można edytować / zatwierdzić / anulować
    string ClientCode,   // Kod klienta (Tenants.Code)
    string ClientName,   // Nazwa firmy klienta
    // Lista pozycji
    List<OrderItemDto> Items
);

// Pozycja przesyłana przy zapisie zamówienia
public record OrderItemInput(
    int ArticleId,
    decimal Quantity
);

// Treść żądania zapisu pozycji zamówienia (PUT /api/orders/{id}/items)
public record SaveOrderItemsRequest(
    List<OrderItemInput> Items
);
