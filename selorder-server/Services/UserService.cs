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
    public async Task UpdateCurrentUserProfileAsync(UpdateUserDto dto, CancellationToken ct = default)
    {
        var userId = userContext.UserId;
        var user = await db.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);

        if (user == null) throw new Exception("User not found");

        user.FirstName = dto.FirstName;
        user.LastName = dto.LastName;
        user.Email = dto.Email;

        // Sprawdzamy czy język istnieje, żeby nie zepsuć klucza obcego
        if (await db.Languages.AnyAsync(l => l.LanguageCode == dto.LanguageCode, ct))
        {
            user.LanguageCode = dto.LanguageCode;
        }

        await db.SaveChangesAsync(ct);
    }

    // ZMIANA HASŁA
    public async Task<bool> ChangePasswordAsync(ChangePasswordDto dto, CancellationToken ct = default)
    {
        var userId = userContext.UserId;
        var user = await db.Users.FirstOrDefaultAsync(u => u.UserId == userId, ct);

        if (user == null) return false;

        // 1. Sprawdź obecne hasło
        // Uwaga: Obsługujemy sytuację, gdy stare hasło w bazie jest Plain Textem (dla pierwszego logowania)
        bool isCurrentValid = false;
        if (user.PasswordHash.StartsWith("$"))
        {
            isCurrentValid = BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash);
        }
        else
        {
            isCurrentValid = user.PasswordHash == dto.CurrentPassword;
        }

        if (!isCurrentValid) return false;

        // 2. Zahashuj nowe hasło
        string newHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);

        // 3. Zapisz
        user.PasswordHash = newHash;
        await db.SaveChangesAsync(ct);

        return true;
    }
}