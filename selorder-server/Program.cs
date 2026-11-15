using Data;
using DTOs;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Resend;
using Services;
using System.Text;
using SelOrder.Server.DTOs;

var options = new WebApplicationOptions
{
    Args = args,
    ContentRootPath = AppContext.BaseDirectory
};

var builder = WebApplication.CreateBuilder(options);

// Sekrety (connection string, JWT, Resend) trzymamy w appsettings.Local.json – plik jest w .gitignore
builder.Configuration.AddJsonFile("appsettings.Local.json", optional: true, reloadOnChange: true);

// 1. Baza Danych (SQL Server)
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Kontekst Użytkownika i Tenanta
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAppUserContext, AppUserContext>();

// 3. Cache i Serwisy
builder.Services.AddHybridCache();

builder.Services.AddOptions<ResendClientOptions>().BindConfiguration("Resend");
builder.Services.AddHttpClient<ResendClient>();
builder.Services.AddTransient<IResend, ResendClient>();

builder.Services.AddScoped<TranslationService>();
builder.Services.AddScoped<ArticleService>();
builder.Services.AddScoped<OrderNumberGenerator>();
builder.Services.AddScoped<OrderService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<OrderEmailService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<AdminService>();

// 4. Auth
var jwtKey = builder.Configuration["JwtSettings:SecretKey"];

if (string.IsNullOrEmpty(jwtKey))
{
    throw new Exception("BŁĄD: Nie znaleziono klucza 'JwtSettings:SecretKey' w appsettings.json!");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ValidateIssuer = false,
        ValidateAudience = false,
        ClockSkew = TimeSpan.Zero
    };
});
// Polityka "Master": tylko użytkownicy tenanta nadrzędnego (claim "IsMaster" w JWT) - panel administratora
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Master", policy => policy.RequireClaim("IsMaster", "true"));
});

// 5. CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();

// ==========================================
// SEKCJA ENDPOINTÓW
// ==========================================

app.MapGet("/api/translations", async (TranslationService service, string? lang) =>
{
    var dictionary = await service.GetAppDictionaryAsync(lang);
    return Results.Ok(dictionary);
})
.AllowAnonymous();

app.MapPost("/api/login", async (
    [FromBody] LoginRequest request,
    AppDbContext db,
    IAuthService authService) =>
{
    // Logowanie loginem LUB adresem e-mail (kolacja bazy Polish_CI_AS => porównanie bez względu na wielkość liter)
    var identifier = request.Login?.Trim() ?? "";

    var user = await db.Users.FirstOrDefaultAsync(u => u.Login == identifier)
               ?? await db.Users.FirstOrDefaultAsync(u => u.Email == identifier);

    if (user == null)
    {
        return Results.Unauthorized();
    }

    // Akceptujemy wyłącznie hasła zahashowane BCryptem (hasła zapisane zwykłym tekstem są odrzucane)
    bool isPasswordValid = false;

    if (user.PasswordHash != null && user.PasswordHash.StartsWith("$"))
    {
        try
        {
            isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
        }
        catch { isPasswordValid = false; }
    }

    if (!isPasswordValid)
    {
        return Results.Unauthorized();
    }

    // Konto lub firma (tenant) wyłączone => brak dostępu.
    // Sprawdzamy dopiero po haśle i zwracamy ten sam 401, żeby nie zdradzać, że konto istnieje.
    var tenant = await db.Tenants
        .Where(t => t.TenantId == user.TenantId)
        .Select(t => new { t.IsActive, t.IsMaster })
        .FirstOrDefaultAsync();

    if (!user.IsActive || tenant is not { IsActive: true })
    {
        return Results.Unauthorized();
    }

    var token = authService.GenerateJwtToken(user, tenant.IsMaster);

    return Results.Ok(new
    {
        Token = token,
        Language = user.LanguageCode,
        Login = user.Login,
        TenantId = user.TenantId
    });
});

// 1. User prosi o reset (wysyłamy maila przez Resend)
app.MapPost("/api/auth/forgot-password", async (
    [FromBody] ForgotPasswordRequest req,
    UserService userService,
    EmailService emailService) =>
{
    string frontendUrl = "http://localhost:5173";
    await userService.InitiatePasswordResetAsync(req.Email, frontendUrl, emailService);
    return Results.Ok(new { message = "Jeśli mail istnieje, wysłaliśmy instrukcję." });
})
.AllowAnonymous();

// 2. User klika w link i ustawia nowe hasło
app.MapPost("/api/auth/reset-password", async (
    [FromBody] ResetPasswordRequest req,
    UserService userService) =>
{
    var success = await userService.CompletePasswordResetAsync(req.Token, req.NewPassword);

    if (!success)
        return Results.BadRequest(new { message = "Link jest nieważny lub wygasł." });

    return Results.Ok(new { message = "Hasło zostało zmienione. Możesz się zalogować." });
})
.AllowAnonymous();

app.MapGet("/api/articles", async (ArticleService service, HttpContext context) =>
{
    int page = int.TryParse(context.Request.Query["page"], out var p) ? p : 1;
    int pageSize = int.TryParse(context.Request.Query["pageSize"], out var ps) ? ps : 20;

    var filters = context.Request.Query
        .Where(q => q.Key.ToLower() != "page" && q.Key.ToLower() != "pagesize")
        .ToDictionary(
            q => q.Key,
            q => q.Value.ToString()
        );

    return await service.GetArticlesPagedAsync(page, pageSize, filters);
})
.RequireAuthorization();

app.MapGet("/api/orders", async (OrderService service, HttpContext context) =>
{
    int page = int.TryParse(context.Request.Query["page"], out var p) ? p : 1;
    int pageSize = int.TryParse(context.Request.Query["pageSize"], out var ps) ? ps : 20;

    var filters = context.Request.Query
        .Where(q => q.Key.ToLower() != "page" && q.Key.ToLower() != "pagesize")
        .ToDictionary(q => q.Key, q => q.Value.ToString());

    return await service.GetOrdersPagedAsync(page, pageSize, filters);
})
.RequireAuthorization();

// Tworzy nowe zamówienie z pozycjami i nadaje mu numer (ZS/{KOD}/{ROK}/{NR})
app.MapPost("/api/orders", async (SaveOrderItemsRequest request, OrderService service) =>
{
    var (result, created) = await service.CreateOrderAsync(request.Items, request.Notes);
    return created is not null
        ? Results.Created($"/api/orders/{created.Id}", created)
        : result.ToHttpResult();
})
.RequireAuthorization();

// Zapis pozycji i uwag zamówienia (tylko w statusie "W opracowaniu", lista pozycji nie może być pusta)
app.MapPut("/api/orders/{id:int}/items", async (int id, SaveOrderItemsRequest request, OrderService service) =>
    (await service.SaveItemsAsync(id, request.Items, request.Notes)).ToHttpResult())
.RequireAuthorization();

// Zatwierdzenie zamówienia: "W opracowaniu" -> "Zatwierdzone" (wymaga pozycji).
// Po udanym zatwierdzeniu twórca dostaje mail z potwierdzeniem (błąd wysyłki jest tylko logowany).
app.MapPost("/api/orders/{id:int}/approve", async (int id, OrderService service, OrderEmailService orderEmails) =>
{
    var result = await service.ApproveAsync(id);
    if (result.Status == OperationStatus.Ok)
        await orderEmails.SendOrderSubmittedAsync(id);
    return result.ToHttpResult();
})
.RequireAuthorization();

// Anulowanie zamówienia: "W opracowaniu" -> "Anulowane"
app.MapPost("/api/orders/{id:int}/cancel", async (int id, OrderService service) =>
    (await service.CancelAsync(id)).ToHttpResult())
.RequireAuthorization();

app.MapGet("/api/orders/{id:int}", async (int id, OrderService service) =>
{
    var order = await service.GetOrderByIdAsync(id);
    return order is not null ? Results.Ok(order) : Results.NotFound();
})
.RequireAuthorization();

// Endpoint testowy
app.MapGet("/api/me", (IAppUserContext context) =>
{
    return Results.Ok(new
    {
        Message = "Jesteś zalogowany!",
        MyId = context.UserId,
        MyTenant = context.TenantId,
        MyLanguage = context.LanguageCode,
        IsMaster = context.IsMaster
    });
}).RequireAuthorization();

// Endpointy profilu
app.MapGet("/api/profile/me", async (UserService service, CancellationToken ct) =>
{
    var user = await service.GetCurrentUserProfileAsync(ct);
    return user is not null ? Results.Ok(user) : Results.NotFound();
})
.RequireAuthorization();

app.MapPut("/api/profile/me", async ([FromBody] UpdateUserDto dto, UserService service, CancellationToken ct) =>
{
    var updated = await service.UpdateCurrentUserProfileAsync(dto, ct);

    if (!updated)
    {
        return Results.BadRequest(new { message = "Ten adres e-mail jest już używany przez inne konto." });
    }

    return Results.Ok(new { message = "Dane zaktualizowane" });
})
.RequireAuthorization();

app.MapPut("/api/profile/password", async ([FromBody] ChangePasswordDto dto, UserService service, CancellationToken ct) =>
{
    var success = await service.ChangePasswordAsync(dto, ct);

    if (!success)
    {
        return Results.BadRequest(new { message = "Obecne hasło jest nieprawidłowe." });
    }

    return Results.Ok(new { message = "Hasło zostało zmienione." });
})
.RequireAuthorization();

// ==========================================
// PANEL ADMINISTRATORA (tylko tenant nadrzędny)
// ==========================================

var admin = app.MapGroup("/api/admin").RequireAuthorization("Master");

// Lista klientów (stronicowanie + filtry "code", "companyName")
admin.MapGet("/tenants", async (AdminService service, HttpContext context) =>
{
    int page = int.TryParse(context.Request.Query["page"], out var p) ? p : 1;
    int pageSize = int.TryParse(context.Request.Query["pageSize"], out var ps) ? ps : 20;

    var filters = context.Request.Query
        .Where(q => q.Key.ToLower() != "page" && q.Key.ToLower() != "pagesize")
        .ToDictionary(q => q.Key, q => q.Value.ToString());

    return await service.GetTenantsPagedAsync(page, pageSize, filters);
});

admin.MapGet("/tenants/{id:guid}", async (Guid id, AdminService service) =>
{
    var tenant = await service.GetTenantAsync(id);
    return tenant is not null ? Results.Ok(tenant) : Results.NotFound();
});

// Nowy klient (kod nadawany tylko tutaj - później nie można go zmienić)
admin.MapPost("/tenants", async (CreateTenantRequest request, AdminService service) =>
{
    var (result, created) = await service.CreateTenantAsync(request);
    return created is not null
        ? Results.Created($"/api/admin/tenants/{created.Id}", created)
        : result.ToHttpResult();
});

// Edycja klienta: nazwa i aktywność
admin.MapPut("/tenants/{id:guid}", async (Guid id, UpdateTenantRequest request, AdminService service) =>
    (await service.UpdateTenantAsync(id, request)).ToHttpResult());

admin.MapGet("/tenants/{id:guid}/users", async (Guid id, AdminService service) =>
{
    var users = await service.GetTenantUsersAsync(id);
    return users is not null ? Results.Ok(users) : Results.NotFound();
});

// Nowy użytkownik klienta
admin.MapPost("/tenants/{id:guid}/users", async (Guid id, CreateUserRequest request, AdminService service) =>
{
    var (result, created) = await service.CreateUserAsync(id, request);
    return created is not null
        ? Results.Created($"/api/admin/tenants/{id}/users/{created.Id}", created)
        : result.ToHttpResult();
});

// Edycja użytkownika (puste NewPassword = hasło bez zmian)
admin.MapPut("/tenants/{tenantId:guid}/users/{userId:int}", async (Guid tenantId, int userId, UpdateUserRequest request, AdminService service) =>
    (await service.UpdateUserAsync(tenantId, userId, request)).ToHttpResult());

app.Run("http://0.0.0.0:5000");

public record LoginRequest(string Login, string Password);

public class PageRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
}
