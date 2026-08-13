using AutoMapper;
using Terma.Application.Categories;
using Terma.Application.Products;
using Terma.Application.Store;
using Terma.Domain.Entities;

namespace Terma.Application.Common.Mapping;

public sealed class CatalogMappingProfile : Profile
{
    public CatalogMappingProfile()
    {
        CreateMap<Category, CategoryDto>();
        CreateMap<ProductVariant, ProductVariantDto>();
        CreateMap<ProductMedia, ProductMediaDto>();
        CreateMap<Product, ProductDto>()
            .ForMember(destination => destination.CategoryName,
                options => options.MapFrom(source => source.Category.Name))
            .ForMember(destination => destination.Variants,
                options => options.MapFrom(source => source.Variants.OrderBy(variant => variant.TableCapacity)))
            .ForMember(destination => destination.Media,
                options => options.MapFrom(source => source.Media.OrderByDescending(media => media.IsPrimary).ThenBy(media => media.SortOrder)));
    }
}
