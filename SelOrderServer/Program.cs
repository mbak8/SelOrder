using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc; // Potrzebne do [FromBody] i Results
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SelOrderServer.Application.Services;
using SelOrderServer.Domain.Entities;      // Tam gdzie są encje
using SelOrderServer.Infrastructure.Auth;
using SelOrderServer.Infrastructure.Data;
using System.Text;


var builder = WebApplication.CreateBuilder(args);

// 1. Baza Danych
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

// 2. Kontekst Użytkownika i Tenanta
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IAppUserContext, AppUserContext>();

// 3. Cache i Serwisy
builder.Services.AddHybridCache(); // (Dla .NET 9)

// --- POPRAWKA TUTAJ: ---
// Zmieniamy z Singleton na Scoped, bo serwis korzysta z Bazy i UserContext
builder.Services.AddScoped<TranslationService>();
// -----------------------

// 4. Auth
var jwtKey = builder.Configuration[""] ?? "ToJestBardzoDlugieHasloDlaDeveloperow123!"; // Upewnij się, że to samo hasło jest przy generowaniu!

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        // Sprawdzamy czy klucz jest poprawny (TO JEST NAJWAŻNIEJSZE)
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),

        // Na devie wyłączamy sprawdzanie Issuera i Audience (częsty powód błędów 401)
        ValidateIssuer = false,
        ValidateAudience = false,

        // Zmniejszamy margines błędu czasu (domyślnie 5 min), żeby token wygasał precyzyjnie
        ClockSkew = TimeSpan.Zero
    };
});
builder.Services.AddAuthorization();
builder.Services.AddScoped<IAuthService, AuthService>();

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


// ==========================================
// SEKCJA MIDDLEWARE (Kolejność jest ważna!)
// ==========================================

app.UseCors("AllowAll"); // 1. Najpierw CORS
app.UseAuthentication(); // 2. Potem sprawdzamy kim jesteś
app.UseAuthorization();  // 3. Potem co możesz robić



// ==========================================
// SEKCJA ENDPOINTÓW (Tu wklej endpointy!)
// ==========================================


app.MapGet("/api/translations", async (TranslationService service) =>
{
    var dictionary = await service.GetAppDictionaryAsync();
    return Results.Ok(dictionary);
})
.RequireAuthorization(); // Wymaga zalogowania

app.MapPost("/api/login", async (
    [FromBody] LoginRequest request,
    AppDbContext db,
    IAuthService authService) =>
{
    // 1. Szukamy użytkownika w bazie (globalnie, bo login jest unikalny)
    var user = await db.Users.FirstOrDefaultAsync(u => u.Login == request.Login);

    // 2. Walidacja hasła
    // UWAGA: W produkcji użyj BCrypt.Verify(request.Password, user.PasswordHash)!
    // Tutaj dla uproszczenia zakładamy, że w bazie masz czysty tekst lub proste porównanie.
    if (user == null || user.PasswordHash != request.Password)
    {
        return Results.Unauthorized();
    }

    // 3. Jeśli OK -> Generujemy Token
    var token = authService.GenerateJwtToken(user);

    // 4. Zwracamy Token oraz Język (żeby frontend wiedział, jak się ustawić)
    return Results.Ok(new
    {
        Token = token,
        Language = user.LanguageCode,
        Login = user.Login,
        TenantId = user.TenantId
    });
});



// ==========================================
// 2. ENDPOINT TESTOWY (Wymaga zalogowania)
// ==========================================
app.MapGet("/api/me", (IAppUserContext context) =>
{
    return Results.Ok(new
    {
        Message = "Jesteś zalogowany!",
        MyId = context.UserId,
        MyTenant = context.TenantId,
        MyLanguage = context.LanguageCode
    });
}).RequireAuthorization(); // <--- To kluczowe! Blokuje dostęp bez tokena











// --- ENDPOINTY (Minimal API) ---

// Endpoint dla Handlowca (Pobiera listę artykułów z przetłumaczonymi jednostkami)
/*
app.MapGet("/api/catalog", async (
    AppDbContext db,
    TranslationService translator) =>
{
    // 1. Pobieramy wspólne artykuły
    var articles = await db.Articles.ToListAsync();

    // 2. Mapujemy wyniki używając Cache'a do tłumaczeń
    var result = new List<object>();
    foreach (var art in articles)
    {
        // Nie podajemy języka! TranslationService bierze go z kontekstu usera (Tokena)
        var unitName = await translator.GetUnitNameAsync(art.UnitId);

        result.Add(new
        {
            art.Name,
            art.Code,
            DisplayQuantity = $"{art.QuantityAvailable} {unitName}"
        });
    }

    return Results.Ok(result);
}).RequireAuthorization(); // Wymaga zalogowania (Usera z TenantId i Language)

*/




app.Run();

// Prosty DTO do przesyłania danych logowania
public record LoginRequest(string Login, string Password);