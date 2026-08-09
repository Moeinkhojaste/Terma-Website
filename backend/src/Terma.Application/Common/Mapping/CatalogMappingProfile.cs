using AutoMapper;
using Terma.Application.Categories;
using Terma.Application.Products;
using Terma.Domain.Entities;

namespace Terma.Application.Common.Mapping;

public sealed class CatalogMappingProfile : Profile
{
    public CatalogMappingProfile()
    {
        CreateMap<Category, CategoryDto>();
        CreateMap<Product, ProductDto>()
            .ForMember(destination => destination.CategoryName,
                options => options.MapFrom(source => source.Category.Name));
    }
}
