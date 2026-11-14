using Entities;
using Microsoft.EntityFrameworkCore;
using Services;

namespace Data;

public class AppDbContext(
    DbContextOptions<AppDbContext> options,
    IAppUserContext userContext) : DbContext(options)
{
    // Capture TenantId at context creation
    private readonly Guid? _currentTenantId = userContext.TenantId;

    public DbSet<Tenant> Tenants { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<Article> Articles { get; set; }
    public DbSet<ArticlesTranslation> ArticlesTranslations { get; set; }
    public DbSet<Unit> Units { get; set; }
    public DbSet<UnitTranslation> UnitTranslations { get; set; }
    public DbSet<AppTranslation> AppTranslations { get; set; }
    public DbSet<Language> Languages { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // --- GLOBALNE FILTRY BEZPIECZEŃSTWA ---
        // Orders i Users widoczne tylko dla swojego Tenanta
        modelBuilder.Entity<Order>().HasQueryFilter(x => _currentTenantId == null || x.TenantId == _currentTenantId);
        modelBuilder.Entity<User>().HasQueryFilter(x => _currentTenantId == null || x.TenantId == _currentTenantId);

        // Indeksy i ograniczenia unikalności zgodne ze schematem bazy danych
        modelBuilder.Entity<Unit>()
            .HasIndex(u => u.Code)
            .IsUnique();

        modelBuilder.Entity<UnitTranslation>()
            .HasIndex(ut => new { ut.UnitId, ut.LanguageCode })
            .IsUnique();

        modelBuilder.Entity<ArticlesTranslation>()
            .HasIndex(at => new { at.ArticleId, at.LanguageCode })
            .IsUnique();

        modelBuilder.Entity<Order>()
            .HasIndex(o => new { o.TenantId, o.OrderNumber })
            .IsUnique();

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Login)
            .IsUnique();
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyTenantId();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override int SaveChanges()
    {
        ApplyTenantId();
        return base.SaveChanges();
    }

    private void ApplyTenantId()
    {
        foreach (var entry in ChangeTracker.Entries<ITenantAware>())
        {
            if (entry.State == EntityState.Added && _currentTenantId.HasValue)
            {
                entry.Entity.TenantId = _currentTenantId.Value;
            }
        }
    }
}
