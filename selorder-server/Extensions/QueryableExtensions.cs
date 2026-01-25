using System.Linq.Expressions;
using System.Reflection;

namespace SelOrderServer.Extensions;

public static class QueryableExtensions
{
    public static IQueryable<T> ApplyDynamicFilters<T>(
        this IQueryable<T> query,
        Dictionary<string, string> filters)
    {
        foreach (var filter in filters)
        {
            if (string.IsNullOrWhiteSpace(filter.Value)) continue;

            // 1. Znajdź właściwość w klasie T o takiej nazwie (case-insensitive)
            // Np. szukamy "code" w klasie Article
            var propertyInfo = typeof(T).GetProperties()
                .FirstOrDefault(p => p.Name.Equals(filter.Key, StringComparison.OrdinalIgnoreCase));

            if (propertyInfo == null) continue; // Nie ma takiej kolumny -> ignorujemy

            // Obsługujemy tylko stringi (dla uproszczenia przykładu)
            if (propertyInfo.PropertyType != typeof(string)) continue;

            // 2. Budujemy wyrażenie: x => x.NazwaKolumny.Contains(wartosc)

            // Parametr 'x'
            var parameter = Expression.Parameter(typeof(T), "x");

            // x.NazwaKolumny
            var propertyAccess = Expression.MakeMemberAccess(parameter, propertyInfo);

            // Stała "wartosc"
            var constant = Expression.Constant(filter.Value);

            // Metoda .Contains()
            var containsMethod = typeof(string).GetMethod("Contains", [typeof(string)]);

            if (containsMethod != null)
            {
                // x.NazwaKolumny.Contains("wartosc")
                var containsExpression = Expression.Call(propertyAccess, containsMethod, constant);

                // Finalna lambda
                var lambda = Expression.Lambda<Func<T, bool>>(containsExpression, parameter);

                // 3. Dodajemy Where do zapytania
                query = query.Where(lambda);
            }
        }

        return query;
    }
}