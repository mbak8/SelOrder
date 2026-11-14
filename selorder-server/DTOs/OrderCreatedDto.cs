namespace DTOs;

// Odpowiedź po utworzeniu nowego zamówienia (wersja robocza bez pozycji)
public record OrderCreatedDto(
    int Id,
    string Number
);
