namespace DTOs;

public class PagedResult<T>(List<T> items, int totalCount, int pageSize, int pageNumber)
{
    public List<T> Items { get; set; } = items;
    public int TotalItems { get; set; } = totalCount;
    public int PageSize { get; set; } = pageSize;
    public int PageNumber { get; set; } = pageNumber;

    // Obliczamy ile jest stron w sumie
    public int TotalPages => (int)Math.Ceiling((double)TotalItems / PageSize);
}