using Microsoft.Data.SqlClient;
using SelOrderIntegration.Models;
using Dapper;
using DeepL;
using Microsoft.Extensions.Configuration;

namespace SelOrderIntegration.Services;

public class ArticleTranslationService
{
    private readonly IConfiguration _configuration;

    public ArticleTranslationService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task RunAsync()
    {
        string connectionString = _configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Brak ConnectionString w pliku appsettings.json.");
        string deepLApiKey = _configuration["DeepL:ApiKey"]
            ?? throw new InvalidOperationException("Brak klucza API DeepL w pliku appsettings.json.");

        var translator = new Translator(deepLApiKey);

        Console.WriteLine("Rozpoczynam proces tłumaczenia brakujących artykułów z języka PL na DE, EN, RU...");

        using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync();

        // Pobieramy listę wszystkich brakujących kombinacji Artykuł <-> Język
        string getMissingTranslationsSql = @"
            SELECT 
                a.ArticleId, 
                a.Name AS OriginalName, 
                l.LanguageCode AS TargetLanguage
            FROM [dbo].[Articles] a
            CROSS JOIN [dbo].[Languages] l
            LEFT JOIN [dbo].[ArticlesTranslations] t 
                ON a.ArticleId = t.ArticleId AND l.LanguageCode = t.LanguageCode
            WHERE t.TranslationId IS NULL 
              AND a.Name != ''
              AND l.LanguageCode != 'PL'";

        var missingTranslations = (await connection.QueryAsync<MissingTranslationDto>(getMissingTranslationsSql)).ToList();

        if (!missingTranslations.Any())
        {
            Console.WriteLine("Wszystkie artykuły posiadają już komplety tłumaczeń.");
            return;
        }

        // GRUPOWANIE PO ARTYKULE (zamiast po języku)
        var groupedByArticle = missingTranslations.GroupBy(x => new { x.ArticleId, x.OriginalName }).ToList();

        Console.WriteLine($"Do przetłumaczenia pozostało {groupedByArticle.Count} artykułów.\n");

        int processedCount = 0;

        foreach (var articleGroup in groupedByArticle)
        {
            processedCount++;
            int articleId = articleGroup.Key.ArticleId;
            string originalName = articleGroup.Key.OriginalName;

            // Pobieramy listę języków, których brakuje DLA TEGO KONKRETNEGO artykułu
            var targetLanguages = articleGroup.Select(x => x.TargetLanguage.Trim()).ToList();

            Console.WriteLine($"[{processedCount}/{groupedByArticle.Count}] ID: {articleId} | '{originalName}' -> Brakujące języki: {string.Join(", ", targetLanguages)}");

            var insertData = new List<object>();

            // Tłumaczymy artykuł na każdy z brakujących języków
            foreach (var dbLangCode in targetLanguages)
            {
                string deepLLangCode = MapLanguageCodeForDeepL(dbLangCode);

                try
                {
                    var translation = await translator.TranslateTextAsync(
                        originalName,
                        sourceLanguageCode: "PL",
                        targetLanguageCode: deepLLangCode
                    );

                    insertData.Add(new
                    {
                        ArticleId = articleId,
                        LanguageCode = dbLangCode,
                        TranslatedName = translation.Text
                    });
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"  -> Błąd DeepL dla języka {dbLangCode}: {ex.Message}");
                    Console.ResetColor();
                }
            }

            // Zapisujemy skompletowane tłumaczenia dla danego artykułu do bazy
            if (insertData.Any())
            {
                try
                {
                    string insertSql = @"
                        INSERT INTO [dbo].[ArticlesTranslations] (ArticleId, LanguageCode, Name)
                        VALUES (@ArticleId, @LanguageCode, @TranslatedName)";

                    int insertedRows = await connection.ExecuteAsync(insertSql, insertData);
                    Console.WriteLine($"  -> Zapisano {insertedRows} tłumaczeń w bazie.");
                }
                catch (Exception ex)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"  -> Błąd zapisu do bazy dla artykułu ID {articleId}: {ex.Message}");
                    Console.ResetColor();
                }
            }
        }

        Console.WriteLine("\nProces tłumaczenia zakończony pomyślnie.");
    }

    private string MapLanguageCodeForDeepL(string dbCode)
    {
        string upperCode = dbCode.Trim().ToUpper();
        return upperCode switch
        {
            "EN" => "EN-US",
            "PT" => "PT-PT",
            _ => upperCode
        };
    }
}