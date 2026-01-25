namespace DTOs;

// Pojedynczy wiersz (pozycja)
public record OrderItemDto(
    int OrderItemId,
    int ArticleId,
    string ArticleCode,  // Z tabeli Articles
    string ArticleName,  // Z tabeli Articles
    decimal Quantity,
    string UnitCode      // Z tabeli Units (przez Article)
);

// Całe zamówienie (Nagłówek + Lista)
public record OrderDetailDto(
    int OrderId,
    string OrderNumber,
    DateTime OrderDate,
    int StatusId,
    string StatusName,
    string? ERPDocument,
    // Lista pozycji
    List<OrderItemDto> Items
);