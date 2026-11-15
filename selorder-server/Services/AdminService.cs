using System.Linq.Expressions;
using System.Net.Mail;
using System.Text.RegularExpressions;
using Data;
using DTOs;
using Entities;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using SelOrderServer.Extensions;

namespace Services;

// Panel administratora: zakładanie i edycja klientów (tenantów) oraz ich użytkowników.
// Tylko dla tenanta nadrzędnego - pilnuje tego polityka "Master" na grupie /api/admin, a tutaj dodatkowo EnsureMaster().
// Użytkownicy innych tenantów są ukryci globalnym filtrem, dlatego zapytania o Users idą przez IgnoreQueryFilters().
// Wyłączenie klienta lub użytkownika działa od następnego logowania (wydany token JWT jest ważny do wygaśnięcia).
public partial class AdminService(AppDbContext db, IAppUserContext userContext)
{
    public const int MinPasswordLength = 8;

    private const int CompanyNameMaxLength = 255;
    private const int ErpCodeMaxLength = 50;
    private const int LoginMaxLength = 100;
    private const int EmailMaxLength = 255;
    private const int PersonNameMaxLength = 100;

    // Jak constraint CK_Tenants_Code: tylko wielkie litery A-Z i cyfry, kolumna nvarchar(10)
    [GeneratedRegex("^[A-Z0-9]{1,10}$")]
    private static partial Regex TenantCodeRegex();

    // Tenants nie mają filtra, ale IgnoreQueryFilters() na korzeniu zapytania wyłącza też filtr Users
    // w podzapytaniu t.Users.Count - inaczej liczba użytkowników innych klientów zawsze wynosiłaby 0
    private static readonly Expression<Func<Tenant, TenantDto>> TenantProjection = t => new TenantDto(
        t.TenantId,
        t.Code,
        t.ERPCode,
        t.CompanyName,
        t.IsActive,
        t.IsMaster,
        t.CreatedAt,
        t.Users.Count);

    private static readonly Expression<Func<User, AdminUserDto>> UserProjection = u => new AdminUserDto(
        u.UserId,
        u.Login,
        u.Email,
        u.FirstName,
        u.LastName,
        u.LanguageCode,
        u.IsActive);

    // ===== KLIENCI =====

    public async Task<PagedResult<TenantDto>> GetTenantsPagedAsync(
        int pageNumber,
        int pageSize,
        Dictionary<string, string> filters,
        CancellationToken ct = default)
    {
        EnsureMaster();

        // Filtry dynamiczne: klucze "code", "erpCode" i "companyName" to nazwy właściwości encji Tenant
        var query = db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .ApplyDynamicFilters(filters);

        int totalCount = await query.CountAsync(ct);

        // Tenant nadrzędny na górze, dalej alfabetycznie po kodzie
        query = query.OrderByDescending(t => t.IsMaster).ThenBy(t => t.Code);

        if (pageSize > 0)
        {
            query = query.Skip((pageNumber - 1) * pageSize).Take(pageSize);
        }

        var items = await query.Select(TenantProjection).ToListAsync(ct);

        return new PagedResult<TenantDto>(items, totalCount, pageSize, pageNumber);
    }

    public async Task<TenantDto?> GetTenantAsync(Guid tenantId, CancellationToken ct = default)
    {
        EnsureMaster();

        return await db.Tenants
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(t => t.TenantId == tenantId)
            .Select(TenantProjection)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<(OperationResult Result, TenantDto? Created)> CreateTenantAsync(
        CreateTenantRequest request,
        CancellationToken ct = default)
    {
        EnsureMaster();

        var code = (request.Code ?? "").Trim().ToUpperInvariant();
        if (!TenantCodeRegex().IsMatch(code))
            return (OperationResult.Invalid("InvalidCode", "Kod klienta może zawierać tylko litery A-Z i cyfry (1-10 znaków)."), null);

        var (nameValidation, companyName) = ValidateCompanyName(request.CompanyName);
        if (nameValidation.Status != OperationStatus.Ok) return (nameValidation, null);

        if (await db.Tenants.AnyAsync(t => t.Code == code, ct))
            return (CodeTaken, null);

        var (erpValidation, erpCode) = await ValidateErpCodeAsync(null, request.ERPCode, ct);
        if (erpValidation.Status != OperationStatus.Ok) return (erpValidation, null);

        // Nowy klient nigdy nie jest nadrzędny (w bazie może być co najwyżej jeden - UQ_Tenants_IsMaster)
        var tenant = new Tenant
        {
            TenantId = Guid.NewGuid(),
            Code = code,
            ERPCode = erpCode,
            CompanyName = companyName,
            IsActive = request.IsActive,
            IsMaster = false,
            CreatedAt = DateTimeOffset.UtcNow
        };

        db.Tenants.Add(tenant);
        if (!await TrySaveAsync(ct)) return (TenantDuplicate, null);

        return (OperationResult.Ok, new TenantDto(
            tenant.TenantId, tenant.Code, tenant.ERPCode, tenant.CompanyName, tenant.IsActive, tenant.IsMaster, tenant.CreatedAt, 0));
    }

    // Kodu nie zmieniamy - jest częścią numerów zamówień (ZS/{KOD}/{ROK}/{NR})
    public async Task<OperationResult> UpdateTenantAsync(Guid tenantId, UpdateTenantRequest request, CancellationToken ct = default)
    {
        EnsureMaster();

        var tenant = await db.Tenants.FirstOrDefaultAsync(t => t.TenantId == tenantId, ct);
        if (tenant == null) return OperationResult.NotFound;

        var (nameValidation, companyName) = ValidateCompanyName(request.CompanyName);
        if (nameValidation.Status != OperationStatus.Ok) return nameValidation;

        // Wyłączenie tenanta nadrzędnego odcięłoby od portalu wszystkich administratorów
        if (tenant.IsMaster && !request.IsActive)
            return OperationResult.Invalid("MasterTenantActive", "Nie można wyłączyć tenanta nadrzędnego.");

        var (erpValidation, erpCode) = await ValidateErpCodeAsync(tenantId, request.ERPCode, ct);
        if (erpValidation.Status != OperationStatus.Ok) return erpValidation;

        tenant.CompanyName = companyName;
        tenant.ERPCode = erpCode;
        tenant.IsActive = request.IsActive;

        // Kodu klienta nie zmieniamy, więc jedyny możliwy konflikt unikalności to kod ERP
        return await TrySaveAsync(ct) ? OperationResult.Ok : ErpCodeTaken;
    }

    // ===== UŻYTKOWNICY KLIENTA =====

    // null = klient nie istnieje
    public async Task<List<AdminUserDto>?> GetTenantUsersAsync(Guid tenantId, CancellationToken ct = default)
    {
        EnsureMaster();

        if (!await db.Tenants.AnyAsync(t => t.TenantId == tenantId, ct)) return null;

        return await db.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => u.TenantId == tenantId)
            .OrderBy(u => u.Login)
            .Select(UserProjection)
            .ToListAsync(ct);
    }

    public async Task<(OperationResult Result, AdminUserDto? Created)> CreateUserAsync(
        Guid tenantId,
        CreateUserRequest request,
        CancellationToken ct = default)
    {
        EnsureMaster();

        if (!await db.Tenants.AnyAsync(t => t.TenantId == tenantId, ct))
            return (OperationResult.NotFound, null);

        var (validation, data) = await ValidateUserAsync(
            null, request.Login, request.Email, request.FirstName, request.LastName, request.LanguageCode, ct);
        if (validation.Status != OperationStatus.Ok) return (validation, null);

        if (!IsPasswordValid(request.Password)) return (PasswordTooShort, null);

        // TenantId ustawiamy jawnie - AppDbContext nie nadpisuje go tenantem administratora
        var user = new User
        {
            TenantId = tenantId,
            Login = data!.Login,
            Email = data.Email,
            FirstName = data.FirstName,
            LastName = data.LastName,
            LanguageCode = data.LanguageCode,
            IsActive = request.IsActive,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password)
        };

        db.Users.Add(user);
        if (!await TrySaveAsync(ct)) return (Duplicate, null);

        return (OperationResult.Ok, new AdminUserDto(
            user.UserId, user.Login, user.Email, user.FirstName, user.LastName, user.LanguageCode, user.IsActive));
    }

    public async Task<OperationResult> UpdateUserAsync(
        Guid tenantId,
        int userId,
        UpdateUserRequest request,
        CancellationToken ct = default)
    {
        EnsureMaster();

        var user = await db.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.UserId == userId && u.TenantId == tenantId, ct);
        if (user == null) return OperationResult.NotFound;

        var (validation, data) = await ValidateUserAsync(
            userId, request.Login, request.Email, request.FirstName, request.LastName, request.LanguageCode, ct);
        if (validation.Status != OperationStatus.Ok) return validation;

        // Administrator nie może zablokować samego siebie
        if (!request.IsActive && user.UserId == userContext.UserId)
            return OperationResult.Invalid("CannotDeactivateSelf", "Nie możesz wyłączyć własnego konta.");

        // Puste hasło = bez zmian. Nowe hasło unieważnia też ewentualny link resetu.
        if (!string.IsNullOrEmpty(request.NewPassword))
        {
            if (!IsPasswordValid(request.NewPassword)) return PasswordTooShort;

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.ResetToken = null;
            user.ResetTokenExpires = null;
        }

        user.Login = data!.Login;
        user.Email = data.Email;
        user.FirstName = data.FirstName;
        user.LastName = data.LastName;
        user.LanguageCode = data.LanguageCode;
        user.IsActive = request.IsActive;

        return await TrySaveAsync(ct) ? OperationResult.Ok : Duplicate;
    }

    // ===== POMOCNICZE =====

    private static readonly OperationResult CodeTaken =
        OperationResult.Conflict("CodeTaken", "Klient o takim kodzie już istnieje.");

    private static readonly OperationResult ErpCodeTaken =
        OperationResult.Conflict("ErpCodeTaken", "Inny klient ma już taki kod ERP.");

    // Wyścig przy dodawaniu klienta: unikalny indeks odrzucił kod albo kod ERP
    private static readonly OperationResult TenantDuplicate =
        OperationResult.Conflict("TenantDuplicate", "Kod klienta lub kod ERP jest już używany przez innego klienta.");

    private static readonly OperationResult Duplicate =
        OperationResult.Conflict("Duplicate", "Login lub e-mail jest już używany przez inne konto.");

    private static readonly OperationResult PasswordTooShort =
        OperationResult.Invalid("PasswordTooShort", $"Hasło musi mieć co najmniej {MinPasswordLength} znaków.");

    private record ValidUser(string Login, string? Email, string? FirstName, string? LastName, string LanguageCode);

    // Polityka "Master" na endpointach już to gwarantuje - to tylko zabezpieczenie na wypadek użycia serwisu gdzie indziej
    private void EnsureMaster()
    {
        if (!userContext.IsMaster)
            throw new UnauthorizedAccessException("Panel administratora jest dostępny tylko dla tenanta nadrzędnego.");
    }

    private static (OperationResult Result, string CompanyName) ValidateCompanyName(string? companyName)
    {
        var trimmed = companyName?.Trim() ?? "";

        if (trimmed.Length == 0 || trimmed.Length > CompanyNameMaxLength)
            return (OperationResult.Invalid("InvalidCompanyName", $"Nazwa firmy jest wymagana (najwyżej {CompanyNameMaxLength} znaków)."), "");

        return (OperationResult.Ok, trimmed);
    }

    // Kod ERP: pusty = brak (null). Wielkość liter zostawiamy jak w ERP (porównanie w bazie i tak jest bez rozróżniania).
    // excludeTenantId = edytowany klient (null przy dodawaniu).
    private async Task<(OperationResult Result, string? ErpCode)> ValidateErpCodeAsync(
        Guid? excludeTenantId,
        string? erpCode,
        CancellationToken ct)
    {
        var trimmed = string.IsNullOrWhiteSpace(erpCode) ? null : erpCode.Trim();
        if (trimmed == null) return (OperationResult.Ok, null);

        if (trimmed.Length > ErpCodeMaxLength)
            return (OperationResult.Invalid("InvalidErpCode", $"Kod ERP może mieć najwyżej {ErpCodeMaxLength} znaków."), null);

        if (await db.Tenants.AnyAsync(t => t.ERPCode == trimmed && t.TenantId != excludeTenantId, ct))
            return (ErpCodeTaken, null);

        return (OperationResult.Ok, trimmed);
    }

    private static bool IsPasswordValid(string? password) =>
        !string.IsNullOrWhiteSpace(password) && password.Length >= MinPasswordLength;

    // Wspólna walidacja przy dodawaniu i edycji. excludeUserId = edytowany użytkownik (null przy dodawaniu).
    private async Task<(OperationResult Result, ValidUser? User)> ValidateUserAsync(
        int? excludeUserId,
        string? login,
        string? email,
        string? firstName,
        string? lastName,
        string? languageCode,
        CancellationToken ct)
    {
        var normalizedLogin = login?.Trim() ?? "";
        if (normalizedLogin.Length == 0 || normalizedLogin.Length > LoginMaxLength)
            return (OperationResult.Invalid("InvalidLogin", $"Login jest wymagany (najwyżej {LoginMaxLength} znaków)."), null);

        var normalizedEmail = string.IsNullOrWhiteSpace(email) ? null : email.Trim();
        if (normalizedEmail != null && !IsEmailValid(normalizedEmail))
            return (OperationResult.Invalid("InvalidEmail", "Adres e-mail jest nieprawidłowy."), null);

        var normalizedFirstName = string.IsNullOrWhiteSpace(firstName) ? null : firstName.Trim();
        var normalizedLastName = string.IsNullOrWhiteSpace(lastName) ? null : lastName.Trim();
        if (normalizedFirstName?.Length > PersonNameMaxLength || normalizedLastName?.Length > PersonNameMaxLength)
            return (OperationResult.Invalid("InvalidName", $"Imię i nazwisko mogą mieć najwyżej {PersonNameMaxLength} znaków."), null);

        var normalizedLanguage = languageCode?.Trim().ToUpperInvariant() ?? "";
        if (!await db.Languages.AnyAsync(l => l.LanguageCode == normalizedLanguage, ct))
            return (OperationResult.Invalid("InvalidLanguage", "Wybrany język nie jest obsługiwany."), null);

        // Unikalność sprawdzamy we wszystkich tenantach (UQ_Users_Tenant_Login i UQ_Users_Email są globalne).
        // Logowanie szuka najpierw po loginie, potem po e-mailu, więc login nie może też być cudzym e-mailem i odwrotnie.
        // UserId zaczyna się od 1, więc 0 = "nikogo nie wykluczamy".
        var excludeId = excludeUserId ?? 0;
        var users = db.Users.IgnoreQueryFilters().Where(u => u.UserId != excludeId);

        if (await users.AnyAsync(u => u.Login == normalizedLogin || u.Email == normalizedLogin, ct))
            return (OperationResult.Conflict("LoginTaken", "Ten login jest już używany przez inne konto."), null);

        if (normalizedEmail != null && await users.AnyAsync(u => u.Email == normalizedEmail || u.Login == normalizedEmail, ct))
            return (OperationResult.Conflict("EmailTaken", "Ten adres e-mail jest już używany przez inne konto."), null);

        return (OperationResult.Ok, new ValidUser(
            normalizedLogin, normalizedEmail, normalizedFirstName, normalizedLastName, normalizedLanguage));
    }

    private static bool IsEmailValid(string email) =>
        email.Length <= EmailMaxLength
        && MailAddress.TryCreate(email, out var address)
        && address.Address == email;

    // Zapis z obsługą wyścigu: równoległe dodanie tego samego kodu/loginu/e-maila odbije się od unikalnego indeksu
    private async Task<bool> TrySaveAsync(CancellationToken ct)
    {
        try
        {
            await db.SaveChangesAsync(ct);
            return true;
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException { Number: 2601 or 2627 })
        {
            return false;
        }
    }
}
