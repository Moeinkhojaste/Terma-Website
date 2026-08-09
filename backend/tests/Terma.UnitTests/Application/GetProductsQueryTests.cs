using Terma.Application.Common.Interfaces;
using Terma.Application.Products.Queries;
using Terma.Domain.Entities;
using Xunit;

namespace Terma.UnitTests.Application;

public class GetProductsQueryTests
{
    private class FakeDbContext : IApplicationDbContext
    {
        public FakeDbContext(List<Product> products)
        {
            ProductsList = products;
        }

        public List<Product> ProductsList { get; }
        public IQueryable<Product> Products => ProductsList.AsQueryable();

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(1);
        }
    }

    [Fact]
    public async Task ExecuteAsync_ShouldReturnActiveProductsOnly()
    {
        var product1 = new Product("پدیدآورد ۱", "p1", "توضیح ۱", 100m, 4, "/img1.jpg");
        var fakeDb = new FakeDbContext(new List<Product> { product1 });
        var query = new GetProductsQuery(fakeDb);

        var result = await query.ExecuteAsync();

        Assert.Single(result);
        Assert.Equal("پدیدآورد ۱", result.First().Name);
    }
}
