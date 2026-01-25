using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Entities;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Services;

public interface IAuthService
{
    string GenerateJwtToken(User user);
}

public class AuthService(IConfiguration configuration) : IAuthService
{
    // Czas ważności tokena (np. pobierany z configu lub sztywno ustawiony)
    private const int TokenExpirationHours = 8;

    public string GenerateJwtToken(User user)
    {
        // 1. Pobieramy sekretny klucz z appsettings.json
        var secretKey = configuration["JwtSettings:SecretKey"];

        if (string.IsNullOrEmpty(secretKey))
        {
            throw new InvalidOperationException("JWT SecretKey is not configured in appsettings.json.");
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        // 2. Budujemy listę Claims (roszczeń)
        // To są dane, które będą "zakodowane" w tokenie i dostępne dla API bez pytania bazy danych.
        var claims = new List<Claim>
        {
            // Standardowe identyfikatory
            new(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
            new(ClaimTypes.Name, user.Login),

            // --- NASZE DANE KONTEKSTOWE ---
            
            // Dzięki temu AppDbContext wie, jakie dane filtrować:
            new("TenantId", user.TenantId.ToString()),

            // Dzięki temu TranslationService wie, jakiego języka użyć (np. "PL", "EN"):
            new("Language", user.LanguageCode)
        };

        // Opcjonalnie: Dodaj imię i nazwisko, jeśli są w bazie
        if (!string.IsNullOrEmpty(user.FirstName))
        {
            claims.Add(new Claim("FirstName", user.FirstName));
        }
        if (!string.IsNullOrEmpty(user.LastName))
        {
            claims.Add(new Claim("LastName", user.LastName));
        }

        // 3. Tworzymy Token
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddHours(TokenExpirationHours),
            SigningCredentials = creds,
            Issuer = configuration["JwtSettings:Issuer"],    // Opcjonalne
            Audience = configuration["JwtSettings:Audience"] // Opcjonalne
        };

        var tokenHandler = new JwtSecurityTokenHandler();
        var token = tokenHandler.CreateToken(tokenDescriptor);

        return tokenHandler.WriteToken(token);
    }
}