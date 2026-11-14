namespace Entities;

public enum OrderStatus
{
    InPreparation = 0, // W opracowaniu (jedyny status, w którym można edytować i anulować)
    Cancelled = 3,     // Anulowane
    Approved = 5,      // Zatwierdzone
    Exported = 10,     // Wyeksportowane
    ExportError = 15   // Błąd eksportu
}