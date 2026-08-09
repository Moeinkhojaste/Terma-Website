using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Terma.Application.Categories;
using Terma.Application.Common.Models;
using Terma.Application.Products;

namespace Terma.IntegrationTests;

public sealed class CatalogApiTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Theory]
    [InlineData("/health/live")]
    [InlineData("/health/ready")]
    public async Task HealthEndpoints_ReturnHealthy(string path)
    {
        var response = await _client.GetAsync(path);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Healthy", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task SwaggerDocument_IsAvailableInDevelopment()
    {
        var response = await _client.GetAsync("/swagger/v1/swagger.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("/api/products", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task CategoryCrud_SupportsSoftDeleteAndReactivation()
    {
        var category = await CreateCategoryAsync();

        var getResponse = await _client.GetAsync($"/api/categories/{category.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        var updateResponse = await _client.PutAsJsonAsync($"/api/categories/{category.Id}", new UpdateCategoryRequest
        {
            Name = category.Name + " updated",
            Description = "Updated description",
            IsActive = false
        });
        var updated = await ReadAsync<CategoryDto>(updateResponse);
        Assert.False(updated.IsActive);
        Assert.NotNull(updated.UpdatedAt);

        var reactivateResponse = await _client.PutAsJsonAsync($"/api/categories/{category.Id}", new UpdateCategoryRequest
        {
            Name = updated.Name,
            Description = updated.Description,
            IsActive = true
        });
        Assert.True((await ReadAsync<CategoryDto>(reactivateResponse)).IsActive);

        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/categories/{category.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/categories/{category.Id}")).StatusCode);

        var inactive = await _client.GetFromJsonAsync<List<CategoryDto>>("/api/categories?isActive=false");
        Assert.Contains(inactive!, item => item.Id == category.Id);
    }

    [Fact]
    public async Task ProductCrud_NormalizesSkuAndSupportsSoftDelete()
    {
        var category = await CreateCategoryAsync();
        var created = await CreateProductAsync(category.Id, " ter-crud-001 ");
        Assert.Equal("TER-CRUD-001", created.Sku);

        var updatedResponse = await _client.PutAsJsonAsync($"/api/products/{created.Id}", ProductRequest(
            category.Id, "TER-CRUD-001", name: "Updated product", isActive: true, price: 2_000_000));
        var updated = await ReadAsync<ProductDto>(updatedResponse);
        Assert.Equal("Updated product", updated.Name);
        Assert.Equal(2_000_000, updated.Price);
        Assert.NotNull(updated.UpdatedAt);

        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/products/{created.Id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/products/{created.Id}")).StatusCode);

        var defaultList = await _client.GetFromJsonAsync<PagedResult<ProductDto>>($"/api/products?categoryId={category.Id}");
        Assert.DoesNotContain(defaultList!.Items, item => item.Id == created.Id);

        var inactiveList = await _client.GetFromJsonAsync<PagedResult<ProductDto>>(
            $"/api/products?categoryId={category.Id}&isActive=false");
        Assert.Contains(inactiveList!.Items, item => item.Id == created.Id);

        var reactivateResponse = await _client.PutAsJsonAsync($"/api/products/{created.Id}", ProductRequest(
            category.Id, created.Sku, name: updated.Name, isActive: true, price: updated.Price));
        Assert.True((await ReadAsync<ProductDto>(reactivateResponse)).IsActive);
    }

    [Fact]
    public async Task DuplicateSku_ReturnsConflictProblemDetails()
    {
        var category = await CreateCategoryAsync();
        var sku = $"TER-{Guid.NewGuid():N}";
        await CreateProductAsync(category.Id, sku);

        var response = await _client.PostAsJsonAsync("/api/products", ProductRequest(category.Id, sku.ToLowerInvariant()));

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(409, json.RootElement.GetProperty("status").GetInt32());
        Assert.True(json.RootElement.TryGetProperty("traceId", out _));
    }

    [Fact]
    public async Task ProductValidation_ReturnsErrorsAndTraceId()
    {
        var response = await _client.PostAsJsonAsync("/api/products", new CreateProductRequest
        {
            Price = 0,
            StockQuantity = -1
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(json.RootElement.TryGetProperty("errors", out var errors));
        Assert.True(errors.TryGetProperty("Price", out _));
        Assert.True(json.RootElement.TryGetProperty("traceId", out _));
    }

    [Fact]
    public async Task MissingCategory_ReturnsNotFound()
    {
        var response = await _client.PostAsJsonAsync("/api/products", ProductRequest(Guid.NewGuid(), "TER-MISSING-001"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ProductListing_AppliesFiltersAndPagination()
    {
        var category = await CreateCategoryAsync();
        var suffix = Guid.NewGuid().ToString("N");
        await CreateProductAsync(category.Id, $"TER-BLUE-{suffix}", "Blue Nila", 1_500_000, 4);
        await CreateProductAsync(category.Id, $"TER-RED-{suffix}", "Red Lajvard", 2_500_000, 6);

        var url = $"/api/products?categoryId={category.Id}&search=Blue&minPrice=1000000&maxPrice=2000000" +
                  "&tableCapacity=4&page=1&pageSize=1";
        var result = await _client.GetFromJsonAsync<PagedResult<ProductDto>>(url);

        Assert.NotNull(result);
        Assert.Single(result.Items);
        Assert.Equal("Blue Nila", result.Items[0].Name);
        Assert.Equal(1, result.TotalCount);
        Assert.Equal(1, result.TotalPages);
    }

    [Fact]
    public async Task InactiveCategory_HidesOtherwiseActiveProduct()
    {
        var category = await CreateCategoryAsync();
        var product = await CreateProductAsync(category.Id, $"TER-HIDDEN-{Guid.NewGuid():N}");
        await _client.DeleteAsync($"/api/categories/{category.Id}");

        var result = await _client.GetFromJsonAsync<PagedResult<ProductDto>>($"/api/products?categoryId={category.Id}");

        Assert.DoesNotContain(result!.Items, item => item.Id == product.Id);
        Assert.Equal(HttpStatusCode.OK, (await _client.GetAsync($"/api/products/{product.Id}")).StatusCode);
    }

    private async Task<CategoryDto> CreateCategoryAsync()
    {
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var response = await _client.PostAsJsonAsync("/api/categories", new CreateCategoryRequest
        {
            Name = $"Tablecloths {suffix}",
            Description = "Integration test category"
        });
        return await ReadAsync<CategoryDto>(response, HttpStatusCode.Created);
    }

    private async Task<ProductDto> CreateProductAsync(
        Guid categoryId,
        string sku,
        string name = "Nila",
        decimal price = 1_500_000,
        int capacity = 4)
    {
        var response = await _client.PostAsJsonAsync("/api/products", ProductRequest(categoryId, sku, name, true, price, capacity));
        return await ReadAsync<ProductDto>(response, HttpStatusCode.Created);
    }

    private static CreateProductRequest ProductRequest(
        Guid categoryId,
        string sku,
        string name = "Nila",
        bool isActive = true,
        decimal price = 1_500_000,
        int capacity = 4) =>
        new()
        {
            Name = name,
            Sku = sku,
            Description = "Traditional tablecloth",
            Price = price,
            StockQuantity = 3,
            TableCapacity = capacity,
            Length = 150,
            Width = 180,
            FabricType = "Termeh",
            LiningType = "Satin",
            Color = "Blue",
            Pattern = "Boteh Jegheh",
            IsActive = isActive,
            CategoryId = categoryId
        };

    private static async Task<T> ReadAsync<T>(HttpResponseMessage response, HttpStatusCode expected = HttpStatusCode.OK)
    {
        Assert.Equal(expected, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<T>())!;
    }
}
