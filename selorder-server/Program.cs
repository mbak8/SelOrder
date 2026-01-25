using Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc; // Potrzebne do [FromBody] i Results
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Services;
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
var jwtKey = builder.Configuration["JwtSettings:SecretKey"];

// Ważne: Sprawdźmy czy klucz nie jest pusty (pomoże w debugowaniu)
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





builder.Services.AddScoped<ArticleService>();
builder.Services.AddScoped<OrderService>();

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
});
//.RequireAuthorization(); // Wymaga zalogowania

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
/*
app.MapGet("/api/articles", async (ArticleService service) =>
{
    return await service.GetAllArticlesAsync();
})
.RequireAuthorization();
*/
app.MapGet("/api/articles", async (ArticleService service, HttpContext context) =>
{
    // 1. Pobierz parametry techniczne (stronicowanie)
    int page = int.TryParse(context.Request.Query["page"], out var p) ? p : 1;
    int pageSize = int.TryParse(context.Request.Query["pageSize"], out var ps) ? ps : 20;

    // 2. Resztę parametrów zapakuj do słownika filtrów
    var filters = context.Request.Query
        .Where(q => q.Key.ToLower() != "page" && q.Key.ToLower() != "pagesize") // Ignoruj parametry stronicowania
        .ToDictionary(
            q => q.Key,
            q => q.Value.ToString()
        );

    // 3. Wywołaj serwis
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

app.MapGet("/api/orders/{id:int}", async (int id, OrderService service) =>
{
    var order = await service.GetOrderByIdAsync(id);
    return order is not null ? Results.Ok(order) : Results.NotFound();
})
.RequireAuthorization();


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




app.Run("http://0.0.0.0:5000");

// Prosty DTO do przesyłania danych logowania
public record LoginRequest(string Login, string Password);

public class PageRequest
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Search { get; set; }
}