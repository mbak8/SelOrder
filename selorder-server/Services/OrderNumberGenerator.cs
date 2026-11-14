using Data;
using Microsoft.EntityFrameworkCore;

namespace Services;

// Generuje numery zamówień w formacie ZS/{KOD_KLIENTA}/{ROK}/{NR}, np. ZS/AGRO/2026/001.
// Numeracja jest osobna dla każdego klienta (Tenanta) i zaczyna się od 1 w każdym roku.
// Wywołuj wewnątrz tej samej transakcji, w której zapisujesz zamówienie –
// wtedy przy błędzie zapisu numer nie przepada.
public class OrderNumberGenerator(AppDbContext db)
{
    private const string Prefix = "ZS";

    public async Task<string> NextAsync(Guid tenantId, int year, CancellationToken ct = default)
    {
        var tenantCode = await db.Tenants
            .Where(t => t.TenantId == tenantId)
            .Select(t => t.Code)
            .SingleAsync(ct);

        // Atomowe zwiększenie licznika: HOLDLOCK blokuje wiersz (lub zakres przy pierwszym
        // zamówieniu w roku), więc dwa równoległe zapisy nigdy nie dostaną tego samego numeru.
        var next = await db.Database.SqlQuery<int>($"""
            MERGE dbo.OrderNumberCounters WITH (HOLDLOCK) AS t
            USING (SELECT {tenantId} AS TenantId, {year} AS [Year]) AS s
                ON t.TenantId = s.TenantId AND t.[Year] = s.[Year]
            WHEN MATCHED THEN
                UPDATE SET LastNumber = t.LastNumber + 1
            WHEN NOT MATCHED THEN
                INSERT (TenantId, [Year], LastNumber) VALUES (s.TenantId, s.[Year], 1)
            OUTPUT inserted.LastNumber AS [Value];
            """).ToListAsync(ct);

        // D3 = co najmniej 3 cyfry; powyżej 999 numer po prostu się wydłuża (1000, 1001…)
        return $"{Prefix}/{tenantCode}/{year}/{next.Single():D3}";
    }
}
