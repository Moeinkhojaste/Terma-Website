using Microsoft.EntityFrameworkCore;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence;

public class TermaDbContext : DbContext
{
    public TermaDbContext(DbContextOptions<TermaDbContext> options) : base(options)
    {
    }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TermaDbContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
