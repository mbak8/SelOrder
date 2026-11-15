namespace DTOs;

// ===== Panel administratora (tylko tenant nadrzędny) =====

// Klient (tenant) na liście i w karcie klienta
public record TenantDto(
    Guid Id,
    string Code,
    string? ERPCode,
    string CompanyName,
    bool IsActive,
    bool IsMaster,
    DateTimeOffset CreatedAt,
    int UserCount
);

// Nowy klient. Kod trafia do numerów zamówień (ZS/{KOD}/{ROK}/{NR}), więc później nie można go zmienić.
// Kod ERP jest opcjonalny (pusty = brak) i można go zmieniać.
public record CreateTenantRequest(
    string Code,
    string? ERPCode,
    string CompanyName,
    bool IsActive
);

// Edycja klienta - bez kodu
public record UpdateTenantRequest(
    string? ERPCode,
    string CompanyName,
    bool IsActive
);

// Użytkownik klienta widziany przez administratora
public record AdminUserDto(
    int Id,
    string Login,
    string? Email,
    string? FirstName,
    string? LastName,
    string LanguageCode,
    bool IsActive
);

public record CreateUserRequest(
    string Login,
    string? Email,
    string? FirstName,
    string? LastName,
    string LanguageCode,
    string Password,
    bool IsActive
);

// Puste NewPassword = hasło bez zmian
public record UpdateUserRequest(
    string Login,
    string? Email,
    string? FirstName,
    string? LastName,
    string LanguageCode,
    bool IsActive,
    string? NewPassword
);
