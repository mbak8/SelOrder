using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities;

// Interfejs-znacznik dla danych prywatnych klienta (Multi-tenancy)
public interface ITenantAware
{
    Guid TenantId { get; set; }
}

[Table("Tenants")]
public class Tenant
{
    [Key]
    public Guid TenantId { get; set; }

    [MaxLength(255)]
    public required string CompanyName { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<User> Users { get; set; } = [];
    public ICollection<Order> Orders { get; set; } = [];
}

[Table("Users")]
public class User : ITenantAware
{
    [Key]
    public int UserId { get; set; }

    public Guid TenantId { get; set; }

    [StringLength(2)]
    [Column(TypeName = "char(2)")]
    public required string LanguageCode { get; set; } = "PL";

    [MaxLength(100)]
    public required string Login { get; set; }

    [MaxLength(255)]
    public string? PasswordHash { get; set; }

    public bool IsActive { get; set; } = true;

    [MaxLength(100)]
    public string? FirstName { get; set; }

    [MaxLength(100)]
    public string? LastName { get; set; }

    [MaxLength(255)]
    public string? Email { get; set; }

    [MaxLength(100)]
    public string? ResetToken { get; set; }

    public DateTime? ResetTokenExpires { get; set; }

    // Nawigacja
    [ForeignKey(nameof(TenantId))]
    public Tenant? Tenant { get; set; }

    [ForeignKey(nameof(LanguageCode))]
    public Language? Language { get; set; }
}

[Table("Orders")]
public class Order : ITenantAware
{
    [Key]
    public int OrderId { get; set; }

    public Guid TenantId { get; set; }
    public int UserId { get; set; }

    [MaxLength(50)]
    public required string OrderNumber { get; set; }

    // Mapujemy bezpośrednio na Enum
    public OrderStatus Status { get; set; } = OrderStatus.InPreparation;

    [MaxLength(512)]
    public string? StatusDescription { get; set; }

    public int? ERPDocId { get; set; }

    [MaxLength(50)]
    public string? ERPDocName { get; set; }

    public DateTime OrderDate { get; set; } = DateTime.UtcNow;

    // Nawigacja
    [ForeignKey(nameof(TenantId))]
    public Tenant? Tenant { get; set; }

    [ForeignKey(nameof(UserId))]
    public User? User { get; set; }

    // Relacja do pozycji zamówienia
    public ICollection<OrderItem> OrderItems { get; set; } = [];
}

[Table("OrderItems")]
public class OrderItem
{
    [Key]
    public int OrderItemId { get; set; }

    public int OrderId { get; set; }

    // Nawigacja w górę (do nagłówka)
    [ForeignKey(nameof(OrderId))]
    public Order Order { get; set; } = null!;

    public int ArticleId { get; set; }

    // Nawigacja do towaru (żeby pobrać nazwę, kod, jednostkę)
    [ForeignKey(nameof(ArticleId))]
    public Article Article { get; set; } = null!;

    [Column(TypeName = "decimal(18,4)")]
    public decimal Quantity { get; set; }
}

[Table("Units")]
public class Unit
{
    [Key]
    public int UnitId { get; set; }

    [MaxLength(10)]
    public required string Code { get; set; }

    public int DecimalPlaces { get; set; } = 0;

    [MaxLength(50)]
    public required string InternalName { get; set; }

    public bool IsActive { get; set; } = true;

    public int SortOrder { get; set; } = 0;

    // Relacja: Jedna jednostka ma wiele tłumaczeń
    public ICollection<UnitTranslation> Translations { get; set; } = [];
}

[Table("UnitTranslations")]
public class UnitTranslation
{
    [Key]
    public int TranslationId { get; set; }

    // Klucz obcy do Unit
    public int UnitId { get; set; }

    [StringLength(2)]
    [Column(TypeName = "char(2)")]
    public required string LanguageCode { get; set; }

    [MaxLength(50)]
    public required string Name { get; set; }

    // Relacja zwrotna do Unit (nawigacja)
    [ForeignKey(nameof(UnitId))]
    public Unit? Unit { get; set; }

    // Relacja do Language
    [ForeignKey(nameof(LanguageCode))]
    public Language? Language { get; set; }
}

[Table("Articles")]
public class Article
{
    [Key]
    public int ArticleId { get; set; }

    [MaxLength(50)]
    public required string Code { get; set; }

    [MaxLength(200)]
    public required string Name { get; set; }

    [Column(TypeName = "decimal(18,3)")]
    public decimal? QuantityAvailable { get; set; }

    [Column(TypeName = "decimal(18,3)")]
    public decimal? QuantityReserved { get; set; }

    public int? ERPId { get; set; }

    // Klucz obcy do tabeli Units
    public int UnitId { get; set; }

    [ForeignKey(nameof(UnitId))]
    public Unit? Unit { get; set; }

    public virtual ICollection<ArticlesTranslation> ArticlesTranslations { get; set; } = [];
}

[Table("ArticlesTranslations")]
public class ArticlesTranslation
{
    [Key]
    public int TranslationId { get; set; }

    public int ArticleId { get; set; }

    [StringLength(2)]
    [Column(TypeName = "char(2)")]
    public required string LanguageCode { get; set; }

    [MaxLength(200)]
    public required string Name { get; set; }

    // Relacja zwrotna do Article (nawigacja)
    [ForeignKey(nameof(ArticleId))]
    public Article? Article { get; set; }

    // Relacja do Language
    [ForeignKey(nameof(LanguageCode))]
    public Language? Language { get; set; }
}

[Table("Languages")]
public class Language
{
    [Key]
    [StringLength(2)]
    [Column(TypeName = "char(2)")]
    public required string LanguageCode { get; set; } // Np. "PL"

    [MaxLength(50)]
    public required string Name { get; set; } 
}

[Table("AppTranslations")]
[PrimaryKey(nameof(TranslationKey), nameof(LanguageCode))]
public class AppTranslation
{
    [MaxLength(100)]
    public required string TranslationKey { get; set; } // Np. "Menu.Dashboard"

    [StringLength(2)]
    [Column(TypeName = "char(2)")]
    public required string LanguageCode { get; set; } // Np. "PL"

    public required string TranslatedText { get; set; } // Np. "Pulpit"

    // Relacja do tabeli Languages (Foreign Key)
    [ForeignKey(nameof(LanguageCode))]
    public Language? Language { get; set; }
}
