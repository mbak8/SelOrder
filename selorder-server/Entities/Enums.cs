namespace Entities;

public enum OrderStatus
{
    InPreparation = 0, // W opracowaniu
    Approved = 5,      // Zatwierdzone
    Exported = 10,     // Wyeksportowane
    ExportError = 15   // Błąd eksportu
}