namespace SelOrderIntegration.Models;

public class MissingTranslationDto
{
    public int ArticleId { get; set; }
    public string OriginalName { get; set; } = string.Empty;
    public string TargetLanguage { get; set; } = string.Empty;
}