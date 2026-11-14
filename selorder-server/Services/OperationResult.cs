namespace Services;

public enum OperationStatus
{
    Ok,
    NotFound,
    Conflict,
    Invalid,
    Forbidden
}

// Wynik operacji zapisu (zamówienia, panel administratora). Code trafia do klienta i służy jako
// klucz tłumaczenia (np. Order.Error.{Code}, Admin.Error.{Code}), Message to polski komunikat zapasowy.
public record OperationResult(OperationStatus Status, string? Code = null, string? Message = null)
{
    public static readonly OperationResult Ok = new(OperationStatus.Ok);
    public static readonly OperationResult NotFound = new(OperationStatus.NotFound);

    public static OperationResult Invalid(string code, string message) =>
        new(OperationStatus.Invalid, code, message);

    public static OperationResult Conflict(string code, string message) =>
        new(OperationStatus.Conflict, code, message);

    public static OperationResult Forbidden(string code, string message) =>
        new(OperationStatus.Forbidden, code, message);

    // Mapowanie na odpowiedź HTTP
    public IResult ToHttpResult() => Status switch
    {
        OperationStatus.Ok => Results.NoContent(),
        OperationStatus.NotFound => Results.NotFound(),
        OperationStatus.Conflict => Results.Conflict(new { code = Code, message = Message }),
        OperationStatus.Forbidden => Results.Json(new { code = Code, message = Message }, statusCode: StatusCodes.Status403Forbidden),
        _ => Results.BadRequest(new { code = Code, message = Message })
    };
}
