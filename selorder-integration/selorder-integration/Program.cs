using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Resend;
using SelOrderIntegration.Services;

// 1. Konfiguracja Hosta i rejestracja serwisów (Dependency Injection)
var host = Host.CreateDefaultBuilder(args)
    // Sekrety (connection string, DeepL, Resend) trzymamy w appsettings.Local.json – plik jest w .gitignore
    .ConfigureAppConfiguration(config => config.AddJsonFile("appsettings.Local.json", optional: true))
    .ConfigureServices((context, services) =>
    {
        // Wysyłka maili (Resend) – jak w selorder-server
        services.AddOptions<ResendClientOptions>().BindConfiguration("Resend");
        services.AddHttpClient<ResendClient>();
        services.AddTransient<IResend, ResendClient>();

        // Tutaj rejestrujesz wszystkie swoje zadania
        services.AddTransient<ArticleTranslationService>();

        // Maile o eksporcie zamówień (wyeksportowane / błąd eksportu) – do wywołania z serwisu eksportu
        services.AddTransient<OrderNotificationService>();

        // W przyszłości dodasz np:
        // services.AddTransient<ErpDownloadService>();
        // services.AddTransient<ErpOrderSyncService>();   // wstrzyknij OrderNotificationService
    })
    .Build();

// 2. Pobranie odpowiedniego serwisu z kontenera DI
var translationService = host.Services.GetRequiredService<ArticleTranslationService>();

// 3. Uruchomienie zadania
await translationService.RunAsync();

// Gdy dojdziesz do etapu integracji z ERP, będziesz mógł pobierać inne serwisy
// var erpService = host.Services.GetRequiredService<ErpDownloadService>();
// await erpService.RunAsync();
