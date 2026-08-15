using Microsoft.EntityFrameworkCore;
using Terma.Application.Common.Exceptions;
using Terma.Application.Common.Interfaces;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence.Repositories;

public sealed class CategoryRepository(TermaDbContext dbContext) : ICategoryRepository
{
    public async Task<IReadOnlyList<Category>> ListAsync(bool isActive, CancellationToken cancellationToken)
    {
        var query = dbContext.Categories.AsNoTracking();
        if (isActive)
            query = query.Where(category => category.IsActive);
        return await query
            .OrderBy(category => category.Name)
            .ThenBy(category => category.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<Category?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Categories.SingleOrDefaultAsync(category => category.Id == id, cancellationToken);

    public Task<Category?> GetBySlugAsync(string slug, CancellationToken cancellationToken) =>
        dbContext.Categories.SingleOrDefaultAsync(category => category.Slug == slug, cancellationToken);

    public Task<bool> SlugExistsAsync(string slug, Guid? excludedCategoryId, CancellationToken cancellationToken) =>
        dbContext.Categories.AnyAsync(
            category => category.Slug == slug && (!excludedCategoryId.HasValue || category.Id != excludedCategoryId.Value),
            cancellationToken);

    public async Task AddAsync(Category category, CancellationToken cancellationToken) =>
        await dbContext.Categories.AddAsync(category, cancellationToken);

    public async Task SaveChangesAsync(CancellationToken cancellationToken)
    {
        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException exception) when (IsSlugConflict(exception))
        {
            throw new ConflictException("A category with this slug already exists.");
        }
    }

    private static bool IsSlugConflict(DbUpdateException exception)
    {
        var message = exception.ToString();
        return message.Contains("IX_Categories_Slug", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Categories.Slug", StringComparison.OrdinalIgnoreCase)
            || message.Contains("Categories', column 'Slug", StringComparison.OrdinalIgnoreCase);
    }
}
