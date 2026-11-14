using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SelOrderIntegration.Services;

// 1. Konfiguracja Hosta i rejestracja serwisów (Dependency Injection)
var host = Host.CreateDefaultBuilder(args)
    // Sekrety (connection string, DeepL) trzymamy w appsettings.Local.json – plik jest w .gitignore
    .ConfigureAppConfiguration(config => config.AddJsonFile("appsettings.Local.json", optional: true))
    .ConfigureServices((context, services) =>
    {
        // Tutaj rejestrujesz wszystkie swoje zadania
        services.AddTransient<ArticleTranslationService>();

        // W przyszłości dodasz np:
        // services.AddTransient<ErpDownloadService>();
        // services.AddTransient<ErpOrderSyncService>();
    })
    .Build();

// 2. Pobranie odpowiedniego serwisu z kontenera DI
var translationService = host.Services.GetRequiredService<ArticleTranslationService>();

// 3. Uruchomienie zadania
await translationService.RunAsync();

// Gdy dojdziesz do etapu integracji z ERP, będziesz mógł pobierać inne serwisy
// var erpService = host.Services.GetRequiredService<ErpDownloadService>();
// await erpService.RunAsync();