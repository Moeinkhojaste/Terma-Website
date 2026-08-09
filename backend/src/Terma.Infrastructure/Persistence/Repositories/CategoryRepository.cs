using Microsoft.EntityFrameworkCore;
using Terma.Application.Common.Interfaces;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence.Repositories;

public sealed class CategoryRepository(TermaDbContext dbContext) : ICategoryRepository
{
    public async Task<IReadOnlyList<Category>> ListAsync(bool isActive, CancellationToken cancellationToken)
    {
        return await dbContext.Categories.AsNoTracking()
            .Where(category => category.IsActive == isActive)
            .OrderBy(category => category.Name)
            .ThenBy(category => category.Id)
            .ToListAsync(cancellationToken);
    }

    public Task<Category?> GetByIdAsync(Guid id, CancellationToken cancellationToken) =>
        dbContext.Categories.SingleOrDefaultAsync(category => category.Id == id, cancellationToken);

    public async Task AddAsync(Category category, CancellationToken cancellationToken) =>
        await dbContext.Categories.AddAsync(category, cancellationToken);

    public async Task SaveChangesAsync(CancellationToken cancellationToken) =>
        await dbContext.SaveChangesAsync(cancellationToken);
}
