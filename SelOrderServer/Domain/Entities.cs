using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace SelOrderServer.Domain.Entities;

// Interfejs-znacznik dla danych prywatnych klienta
public interface ITenantAware
{
    int TenantId { get; set; }
}

public class User : ITenantAware
{
    public int UserId { get; set; }
    public int TenantId { get; set; }

    [StringLength(2)]
    public required string LanguageCode { get; set; } // Np. "PL", "EN"

    public required string Login { get; set; }
    public string? PasswordHash { get; set; }
    public bool IsActive { get; set; }

    public string? FirstName { get; set; }
    public string? LastName { get; set; }
}

public class OrderItem
{
    public int OrderItemId { get; set; }
 
}
public class Order : ITenantAware
{
    [Key]
    public int OrderId { get; set; }
    public int TenantId { get; set; }
    public int UserId { get; set; }
    public required string OrderNumber { get; set; }
    public ICollection<OrderItem> OrderItems { get; set; } = [];
}

// Dane wspólne (nie implementują ITenantAware)
public class Article
{
    [Key]
    public int ArticleId { get; set; }
    public required string Code { get; set; }
    public required string Name { get; set; }
    public decimal QuantityAvailable { get; set; }
    public int UnitId { get; set; }
}

public class UnitTranslation
{
    [Key]
    public int TranslationId { get; set; }
    public int UnitId { get; set; }
    [StringLength(2)]
    public required string LanguageCode { get; set; }
    public required string Name { get; set; }
}
public class Language
{
    [Key]
    [StringLength(2)]
    [Column(TypeName = "char(2)")] // Ważne: mapujemy na char(2), nie nvarchar
    public required string LanguageCode { get; set; } // Np. "PL"

    [MaxLength(50)]
    public required string Name { get; set; } 
}
[PrimaryKey(nameof(TranslationKey), nameof(LanguageCode))]
public class AppTranslation
{
    [MaxLength(100)]
    public required string TranslationKey { get; set; } // Np. "Menu.Dashboard"

    [StringLength(2)]
    [Column(TypeName = "char(2)")] // Ważne: mapujemy na char(2), nie nvarchar
    public required string LanguageCode { get; set; } // Np. "PL"

    public required string TranslatedText { get; set; } // Np. "Pulpit"

    // Relacja do tabeli Languages (Foreign Key)
    [ForeignKey(nameof(LanguageCode))]
    public Language? Language { get; set; }
}


// ... reszta klas (Unit, AppTranslation) analogicznie