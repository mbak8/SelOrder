using Microsoft.EntityFrameworkCore;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Entities;

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

[Table("OrderItems")]
public class OrderItem
{
    [Key]
    public int OrderItemId { get; set; }

    public int OrderId { get; set; }
    // Nawigacja w górę (do nagłówka)
    public Order Order { get; set; } = null!;

    public int ArticleId { get; set; }
    // Nawigacja do towaru (żeby pobrać nazwę, kod, jednostkę)
    public Article Article { get; set; } = null!;

    [Column(TypeName = "decimal(18,4)")]
    public decimal Quantity { get; set; }
}

[Table("Orders")] // Mapowanie na tabelę SQL
public class Order : ITenantAware
{
    [Key]
    public int OrderId { get; set; }

    public int TenantId { get; set; }
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

    public DateTime OrderDate { get; set; } = DateTime.Now;

    // Relacja do pozycji zamówienia (będzie potrzebna później)
    public ICollection<OrderItem> OrderItems { get; set; } = [];
}

[Table("Units")]
public class Unit
{
    [Key]
    public int UnitId { get; set; }

    [MaxLength(10)]
    public required string Code { get; set; } // SQL: NOT NULL

    // SQL: [DecimalPlaces] [int] NOT NULL DEFAULT ((0))
    public int DecimalPlaces { get; set; } = 0;

    // SQL: [InternalName] [nvarchar](50) NOT NULL
    [MaxLength(50)]
    public required string InternalName { get; set; }

    // SQL: [IsActive] [bit] NOT NULL DEFAULT ((1))
    // Mapujemy bit na bool. Dajemy true, żeby nowy obiekt był domyślnie aktywny.
    public bool IsActive { get; set; } = true;

    // SQL: [SortOrder] [int] NOT NULL DEFAULT ((0))
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

    // SQL: [char](2) NOT NULL
    [StringLength(2)]
    [Column(TypeName = "char(2)")]
    public required string LanguageCode { get; set; }

    [MaxLength(50)]
    public required string Name { get; set; }

    // Relacja zwrotna do Unit (nawigacja)
    [ForeignKey(nameof(UnitId))]
    public Unit? Unit { get; set; }

    // Relacja do Language (opcjonalnie, jeśli potrzebujesz)
    [ForeignKey(nameof(LanguageCode))]
    public Language? Language { get; set; }
}

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

    // Klucz obcy do nowej tabeli Units
    public int UnitId { get; set; }

    [ForeignKey(nameof(UnitId))]
    public Unit? Unit { get; set; }
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