using Microsoft.EntityFrameworkCore;
using Terma.Application.Common.Interfaces;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence;

public class TermaDbContext : DbContext, IApplicationDbContext
{
    public TermaDbContext(DbContextOptions<TermaDbContext> options) : base(options)
    {
    }

    public DbSet<Product> Products => Set<Product>();

    IQueryable<Product> IApplicationDbContext.Products => Products.AsNoTracking();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TermaDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
