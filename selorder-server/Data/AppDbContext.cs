using Entities;
using Microsoft.EntityFrameworkCore;
using Services;

namespace Data;

public class AppDbContext(
    DbContextOptions<AppDbContext> options,
    IAppUserContext userContext) : DbContext(options)
{
    // Capture TenantId at context creation
    private readonly int? _currentTenantId = userContext.TenantId;

    public DbSet<User> Users { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<Article> Articles { get; set; } // Wspólne
    public DbSet<UnitTranslation> UnitTranslations { get; set; } // Wspólne
    public DbSet<AppTranslation> AppTranslations { get; set; } // Wspólne

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // --- GLOBALNE FILTRY BEZPIECZEŃSTWA ---

        // Orders i Users widoczne tylko dla swojego Tenanta
        modelBuilder.Entity<Order>().HasQueryFilter(x => _currentTenantId == null || x.TenantId == _currentTenantId);
        modelBuilder.Entity<User>().HasQueryFilter(x => _currentTenantId == null || x.TenantId == _currentTenantId);

        modelBuilder.Entity<Unit>()
        .HasIndex(u => u.Code)
        .IsUnique();

        modelBuilder.Entity<UnitTranslation>()
        .HasIndex(ut => new { ut.UnitId, ut.LanguageCode })
        .IsUnique();
        // Articles, Units, Translations NIE MAJĄ filtra -> są wspólne.
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // Automatyczne ustawianie TenantId przy INSERT
        foreach (var entry in ChangeTracker.Entries<ITenantAware>())
        {
            if (entry.State == EntityState.Added && _currentTenantId.HasValue)
            {
                entry.Entity.TenantId = _currentTenantId.Value;
            }
        }
        return base.SaveChangesAsync(cancellationToken);
    }
}