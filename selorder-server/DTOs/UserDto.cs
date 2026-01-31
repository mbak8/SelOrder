namespace SelOrder.Server.DTOs;

// 1. DTO do wyświetlania profilu (READ)
// Odzwierciedla bezpieczne dane z tabeli Users
public record UserDto(
    int UserId,
    string Login,           // Login jest zazwyczaj tylko do odczytu
    string? FirstName,      // Nullable w bazie -> Nullable w C#
    string? LastName,
    string? Email,
    string LanguageCode,    // 'PL', 'EN' etc.
    bool IsActive           // Może się przydać na froncie
);

// 2. DTO do aktualizacji danych (WRITE)
// Użytkownik nie może zmienić tutaj Loginu ani ID, tylko dane osobowe
public record UpdateUserDto(
    string? FirstName,
    string? LastName,
    string? Email,
    string LanguageCode
);

// 3. DTO do zmiany hasła (WRITE)
public record ChangePasswordDto(
    string CurrentPassword,
    string NewPassword
);

public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(string Token, string NewPassword);