// SelOrderServer.Application.DTOs.OrderDto

namespace DTOs;

public record OrderDto(
    int Id,
    string Number,
    DateTime Date,
    int StatusId,          // Np. 5
    string StatusName,     // Np. "Zatwierdzone" (Tłumaczenie)
    string? ERPDocument,   // Nazwa dokumentu w ERP (np. ZK/2023/1)
    string? StatusDescription // Dodatkowy opis błędu itp.
                              // W przyszłości dodamy tu np. TotalValue (Suma zamówienia)
);