namespace Terma.Application.Products.Dtos;

public record ProductDto(
    Guid Id,
    string Name,
    string Slug,
    string Description,
    decimal Price,
    int CapacityPersons,
    string ImageUrl,
    bool IsActive
);
