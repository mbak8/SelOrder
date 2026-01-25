namespace DTOs;

public record ArticleDto(
    int Id,
    string Code,
    string Name,
    int? ERPId,

    // Ilości (zamieniamy null na 0 w serwisie, tu wysyłamy konkret)
    decimal QuantityAvailable,
    decimal QuantityReserved,

    // Dane jednostki miary
    string UnitCode,       // Np. "kg" (niezależne od języka)
    string UnitName,       // Np. "Kilogram" (przetłumaczone!)
    int DecimalPlaces      // Np. 0 dla sztuk, 3 dla wagi
);