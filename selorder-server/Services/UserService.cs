using Data;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;
using SelOrder.Server.DTOs;

namespace Services;

public class UserService(AppDbContext db, IAppUserContext userContext)
{
    // GET
    public async Task<UserDto?> GetCurrentUserProfileAsync(CancellationToken ct = default)
    {
        var userId = userContext.UserId;

        return await db.Users
            .AsNoTracking()
            .Where(u => u.UserId == userId)
            .Select(u => new UserDto(
                u.UserId,
                u.Login,
                u.FirstName,
                u.LastName,
                u.Email,
                u.LanguageCode,
                u.IsActive
            ))
            .FirstOrDefaultAsync(ct);
    }

    // UPDATE DANYCH
    // Zwraca false, gdy podany e-mail jest już przypisany do innego konta (e-mail jest unikalny i służy też do logowania)
    public async Task<bool> UpdateCurrentUserProfileAsync(UpdateUserDto dto, CancellationToken ct = default)
    {
        var userId = userContext.UserId;
        var user = await db.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);

        if (user == null) throw new Exception("User not found");

        var email = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim();

        // IgnoreQueryFilters: unikalność e-maila sprawdzamy we wszystkich tenantach, nie tylko w bieżącym
        if (email != null && await db.Users.IgnoreQueryFilters()
                .AnyAsync(u => u.Email == email && u.UserId != user.UserId, ct))
        {
            return false;
        }

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Email = email;

        // Sprawdzamy czy język istnieje, żeby nie zepsuć klucza obcego
        if (await db.Languages.AnyAsync(l => l.LanguageCode == dto.LanguageCode, ct))
        {
            user.LanguageCode = dto.LanguageCode;
        }

        await db.SaveChangesAsync(ct);
        return true;
    }

    // ZMIANA HASŁA
    public async Task<bool> ChangePasswordAsync(ChangePasswordDto dto, CancellationToken ct = default)
    {
        var userId = userContext.UserId;
        var user = await db.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);

        if (user == null) return false;

        // 1. Sprawdź obecne hasło (tylko BCrypt – hasła zapisane zwykłym tekstem nie są akceptowane)
        bool isCurrentValid = !string.IsNullOrEmpty(user.PasswordHash)
                              && user.PasswordHash.StartsWith("$")
                              && BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash);

        if (!isCurrentValid) return false;

        // 2. Zahashuj nowe hasło
        string newHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);

        // 3. Zapisz
        user.PasswordHash = newHash;
        await db.SaveChangesAsync(ct);

        return true;
    }


    // W klasie UserService

    // KROK A: Rozpoczęcie procedury (Generuje token i wysyła maila)
    public async Task InitiatePasswordResetAsync(string email, string frontendUrlBase, EmailService emailService)
    {
        // Szukamy użytkownika po mailu
        email = email?.Trim() ?? "";
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        // SECURITY: Jeśli user nie istnieje (lub jest wyłączony), nie rzucamy błędu, żeby nie zdradzać, czy mail jest w bazie.
        // Po prostu kończymy funkcję.
        if (user == null || !user.IsActive) return;

        // Generujemy Token (GUID)
        var token = Guid.NewGuid().ToString();

        // Zapisujemy w bazie (ważny 1h)
        user.ResetToken = token;
        user.ResetTokenExpires = DateTimeOffset.UtcNow.AddHours(1);

        await db.SaveChangesAsync();

        // Budujemy link (to musi być link do REACTA, nie do API!)
        // np. http://localhost:5173/reset-password?token=abc-123
        string link = $"{frontendUrlBase}/reset-password?token={token}";

        // Wysyłamy maila
        await emailService.SendPasswordResetEmailAsync(email, link);
    }

    // KROK B: Finalizacja (Przyjmuje token i nowe hasło)
    public async Task<bool> CompletePasswordResetAsync(string token, string newPassword)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.ResetToken == token);

        // Sprawdzamy czy token istnieje i czy nie wygasł
        if (user == null || !user.IsActive || user.ResetTokenExpires < DateTimeOffset.UtcNow)
        {
            return false; // Token nieważny
        }

        // Zmieniamy hasło
        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);

        // Czyścimy token, żeby nie można go było użyć drugi raz
        user.ResetToken = null;
        user.ResetTokenExpires = null;

        await db.SaveChangesAsync();
        return true;
    }
}