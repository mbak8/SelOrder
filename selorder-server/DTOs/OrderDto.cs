// SelOrderServer.Application.DTOs.OrderDto

namespace DTOs;

public record OrderDto(
    int Id,
    string Number,
    DateTimeOffset Date,   // Zawsze UTC (+00:00); klient przelicza na czas lokalny
    int StatusId,          // Np. 5
    string StatusName,     // Np. "Zatwierdzone" (Tłumaczenie)
    string? ERPDocument,   // Nazwa dokumentu w ERP (np. ZK/2023/1)
    string? StatusDescription, // Dodatkowy opis błędu itp.
    bool IsEditable            // Czy zamówienie można edytować (decyduje serwer, klient tylko wyświetla)
                               // W przyszłości dodamy tu np. TotalValue (Suma zamówienia)
);