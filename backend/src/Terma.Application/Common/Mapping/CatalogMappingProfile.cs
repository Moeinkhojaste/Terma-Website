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
        CreateMap<Category, PublicCategoryDto>();

        CreateMap<ProductVariant, ProductVariantDto>();
        CreateMap<ProductVariant, PublicProductVariantDto>();

        CreateMap<ProductMedia, ProductMediaDto>();

        CreateMap<Product, ProductDto>()
            .ForMember(d => d.CategoryName, opt => opt.MapFrom(s => s.Category != null ? s.Category.Name : string.Empty))
            .ForMember(d => d.CategorySlug, opt => opt.MapFrom(s => s.Category != null ? s.Category.Slug : string.Empty))
            .ForMember(d => d.Variants, opt => opt.MapFrom(s => s.Variants.OrderBy(v => v.TableCapacity)))
            .ForMember(d => d.Media, opt => opt.MapFrom(s => s.Media.OrderByDescending(m => m.IsPrimary).ThenBy(m => m.SortOrder)));

        CreateMap<Product, PublicProductDto>()
            .ForMember(d => d.AvailableQuantity, opt => opt.MapFrom(s => s.StockQuantity))
            .ForMember(d => d.CategoryName, opt => opt.MapFrom(s => s.Category != null ? s.Category.Name : string.Empty))
            .ForMember(d => d.CategorySlug, opt => opt.MapFrom(s => s.Category != null ? s.Category.Slug : string.Empty))
            .ForMember(d => d.Variants, opt => opt.MapFrom(s => s.Variants.Where(v => v.IsActive).OrderBy(v => v.TableCapacity)))
            .ForMember(d => d.Media, opt => opt.MapFrom(s => s.Media.OrderByDescending(m => m.IsPrimary).ThenBy(m => m.SortOrder)));
    }
}
