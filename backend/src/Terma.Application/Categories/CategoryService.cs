using AutoMapper;
using FluentValidation;
using Terma.Application.Common.Exceptions;
using Terma.Application.Common.Interfaces;
using Terma.Domain.Entities;

namespace Terma.Application.Categories;

public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> ListAsync(bool isActive, CancellationToken cancellationToken);
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
    public async Task<IReadOnlyList<CategoryDto>> ListAsync(bool isActive, CancellationToken cancellationToken)
    {
        var categories = await repository.ListAsync(isActive, cancellationToken);
        return mapper.Map<IReadOnlyList<CategoryDto>>(categories);
    }

    public async Task<CategoryDto> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var category = await GetCategoryAsync(id, cancellationToken);
        return mapper.Map<CategoryDto>(category);
    }

    public async Task<CategoryDto> CreateAsync(CreateCategoryRequest request, CancellationToken cancellationToken)
    {
        await createValidator.ValidateAndThrowAsync(request, cancellationToken);
        var category = new Category(request.Name, request.Description, request.IsActive);
        await repository.AddAsync(category, cancellationToken);
        await repository.SaveChangesAsync(cancellationToken);
        return mapper.Map<CategoryDto>(category);
    }

    public async Task<CategoryDto> UpdateAsync(Guid id, UpdateCategoryRequest request, CancellationToken cancellationToken)
    {
        await updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var category = await GetCategoryAsync(id, cancellationToken);
        category.Update(request.Name, request.Description, request.IsActive);
        await repository.SaveChangesAsync(cancellationToken);
        return mapper.Map<CategoryDto>(category);
    }

    public async Task DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var category = await GetCategoryAsync(id, cancellationToken);
        category.Deactivate();
        await repository.SaveChangesAsync(cancellationToken);
    }

    private async Task<Category> GetCategoryAsync(Guid id, CancellationToken cancellationToken)
    {
        return await repository.GetByIdAsync(id, cancellationToken)
            ?? throw new NotFoundException($"Category '{id}' was not found.");
    }
}
