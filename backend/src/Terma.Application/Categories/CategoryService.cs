using AutoMapper;
using FluentValidation;
using Terma.Application.Common.Exceptions;
using Terma.Application.Common.Interfaces;
using Terma.Domain.Entities;
using Terma.Domain.Services;

namespace Terma.Application.Categories;

public interface ICategoryService
{
    Task<IReadOnlyList<PublicCategoryDto>> ListPublicAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<CategoryDto>> ListAdminAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<CategoryDto>> ListAsync(bool isActive, CancellationToken cancellationToken);
    Task<PublicCategoryDto> GetPublicByIdOrSlugAsync(string identifier, CancellationToken cancellationToken);
    Task<CategoryDto> GetAdminByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<CategoryDto> GetAsync(Guid id, CancellationToken cancellationToken);
    Task<CategoryDto> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken);
    Task<CategoryDto> UpdateAsync(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken);
    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}

public sealed class CategoryService(
    ICategoryRepository repository,
    IValidator<CreateCategoryRequest> createValidator,
    IValidator<UpdateCategoryRequest> updateValidator,
    IMapper mapper) : ICategoryService
{
    public async Task<IReadOnlyList<PublicCategoryDto>> ListPublicAsync(CancellationToken cancellationToken)
    {
        var categories = await repository.ListAsync(isActive: true, cancellationToken);
        return mapper.Map<IReadOnlyList<PublicCategoryDto>>(categories);
    }

    public async Task<IReadOnlyList<CategoryDto>> ListAdminAsync(CancellationToken cancellationToken)
    {
        var categories = await repository.ListAsync(isActive: false, cancellationToken);
        return mapper.Map<IReadOnlyList<CategoryDto>>(categories);
    }

    public async Task<IReadOnlyList<CategoryDto>> ListAsync(bool isActive, CancellationToken cancellationToken)
    {
        var categories = await repository.ListAsync(isActive, cancellationToken);
        return mapper.Map<IReadOnlyList<CategoryDto>>(categories);
    }

    public async Task<PublicCategoryDto> GetPublicByIdOrSlugAsync(string identifier, CancellationToken cancellationToken)
    {
        Category? category = null;
        if (Guid.TryParse(identifier, out var id))
        {
            category = await repository.GetByIdAsync(id, cancellationToken);
        }
        else
        {
            var normalizedSlug = PersianSlugHelper.GenerateSlug(identifier);
            category = await repository.GetBySlugAsync(normalizedSlug, cancellationToken);
        }

        if (category is null || !category.IsActive)
            throw new NotFoundException($"Category '{identifier}' was not found.");

        return mapper.Map<PublicCategoryDto>(category);
    }

    public async Task<CategoryDto> GetAdminByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var category = await repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"Category '{id}' was not found.");
        return mapper.Map<CategoryDto>(category);
    }

    public Task<CategoryDto> GetAsync(Guid id, CancellationToken cancellationToken) =>
        GetAdminByIdAsync(id, cancellationToken);

    public async Task<CategoryDto> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        await createValidator.ValidateAndThrowAsync(request, cancellationToken);

        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? await GenerateUniqueSlugAsync(request.Name, null, cancellationToken)
            : PersianSlugHelper.NormalizeSlug(request.Slug);

        if (await repository.SlugExistsAsync(slug, null, cancellationToken))
            throw new ConflictException($"A category with slug '{slug}' already exists.");

        var category = new Category(request.Name, request.Description, request.IsActive, slug);
        await repository.AddAsync(category, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
        return mapper.Map<CategoryDto>(category);
    }

    public async Task<CategoryDto> UpdateAsync(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        await updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var category = await repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"Category '{id}' was not found.");

        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? category.Slug
            : PersianSlugHelper.NormalizeSlug(request.Slug);

        if (slug != category.Slug && await repository.SlugExistsAsync(slug, id, cancellationToken))
            throw new ConflictException($"A category with slug '{slug}' already exists.");

        category.Update(request.Name, request.Description, request.IsActive, slug);
        await repository.SaveChangesAsync(cancellationToken);
        return mapper.Map<CategoryDto>(category);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var category = await repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"Category '{id}' was not found.");
        category.Deactivate();
        await repository.SaveChangesAsync(cancellationToken);
    }

    private async Task<string> GenerateUniqueSlugAsync(string name, Guid? excludedId, CancellationToken cancellationToken)
    {
        var baseSlug = PersianSlugHelper.GenerateSlug(name);
        var slug = baseSlug;
        var suffix = 1;
        while (await repository.SlugExistsAsync(slug, excludedId, cancellationToken))
        {
            suffix++;
            slug = $"{baseSlug}-{suffix}";
        }
        return slug;
    }
}
