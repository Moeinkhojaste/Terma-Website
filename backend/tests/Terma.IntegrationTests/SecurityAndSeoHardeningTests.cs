using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using Terma.Application.Categories;
using Terma.Application.Customers;
using Terma.Application.Products;
using Terma.Application.Store;

namespace Terma.IntegrationTests;

public sealed class SecurityAndSeoHardeningTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    [Fact]
    public async Task CustomerOrder_IdorPrevention_CustomerCannotAccessAnotherCustomersOrder()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var catRes = await admin.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest { Name = $"SecurityCat {Guid.NewGuid():N}" });
        var category = (await catRes.Content.ReadFromJsonAsync<CategoryDto>())!;
        var prodRes = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest
        {
            Name = "Security Product",
            Sku = $"SEC-{Guid.NewGuid():N}",
            Description = "desc",
            Price = 5000,
            StockQuantity = 10,
            TableCapacity = 6,
            Length = 200,
            Width = 200,
            FabricType = "Silk",
            LiningType = "Cotton",
            Color = "Red",
            Pattern = "Paisley",
            CategoryId = category.Id
        });
        var product = (await prodRes.Content.ReadFromJsonAsync<ProductDto>())!;

        // Customer A places an order
        var phoneA = $"0912{Random.Shared.Next(1_000_000, 9_999_999)}";
        using var clientA = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(clientA);
        clientA.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var orderResA = await clientA.PostAsJsonAsync("/api/orders", new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(product.Id, null, 1)],
            FullName = "Customer A",
            Phone = phoneA,
            Province = "Tehran",
            City = "Tehran",
            Address = "Customer A Full Address",
            PostalCode = "1111111111"
        });
        orderResA.EnsureSuccessStatusCode();
        var orderA = (await orderResA.Content.ReadFromJsonAsync<CreatedOrderDto>())!;

        // Customer B logs in via OTP
        var phoneB = $"0912{Random.Shared.Next(1_000_000, 9_999_999)}";
        using var clientB = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(clientB);
        var otpResB = await clientB.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phoneB));
        var challengeB = (await otpResB.Content.ReadFromJsonAsync<RequestOtpResponse>())!;
        (await clientB.PostAsJsonAsync("/api/customer-auth/otp/verify", new VerifyOtpRequest(challengeB.ChallengeId, challengeB.DevelopmentCode!))).EnsureSuccessStatusCode();

        // Customer B attempts to access Customer A's order details
        var accessRes = await clientB.GetAsync($"/api/customer/orders/{orderA.Id}");
        Assert.Equal(HttpStatusCode.NotFound, accessRes.StatusCode);
    }

    [Fact]
    public async Task OrderCreation_IdempotencyKey_MismatchPayloadReturns409Conflict()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var catRes = await admin.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest { Name = $"IdemCat {Guid.NewGuid():N}" });
        var category = (await catRes.Content.ReadFromJsonAsync<CategoryDto>())!;
        var prodRes = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest
        {
            Name = "Idem Product",
            Sku = $"IDEM-{Guid.NewGuid():N}",
            Description = "desc",
            Price = 2000,
            StockQuantity = 10,
            TableCapacity = 4,
            Length = 100,
            Width = 100,
            FabricType = "Silk",
            LiningType = "Cotton",
            Color = "Gold",
            Pattern = "Geometric",
            CategoryId = category.Id
        });
        var product = (await prodRes.Content.ReadFromJsonAsync<ProductDto>())!;

        var idempotencyKey = Guid.NewGuid().ToString();
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        client.DefaultRequestHeaders.Add("Idempotency-Key", idempotencyKey);

        var firstRes = await client.PostAsJsonAsync("/api/orders", new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(product.Id, null, 1)],
            FullName = "Idem User 1",
            Phone = "09121112233",
            Province = "Tehran",
            City = "Tehran",
            Address = "First Address Line Here",
            PostalCode = "1234567890"
        });
        firstRes.EnsureSuccessStatusCode();

        // Second request with SAME key but DIFFERENT payload (e.g. different name / address)
        var secondRes = await client.PostAsJsonAsync("/api/orders", new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(product.Id, null, 1)],
            FullName = "Different Name",
            Phone = "09121112233",
            Province = "Tehran",
            City = "Tehran",
            Address = "Different Address Line Here",
            PostalCode = "1234567890"
        });
        Assert.Equal(HttpStatusCode.Conflict, secondRes.StatusCode);
    }

    [Fact]
    public async Task Product_PersianSlugAndLookup_ResolvesCorrectly()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var catRes = await admin.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest { Name = "رومیزی ابریشم یزد" });
        var category = (await catRes.Content.ReadFromJsonAsync<CategoryDto>())!;
        Assert.Equal("رومیزی-ابریشم-یزد", category.Slug);

        var prodRes = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest
        {
            Name = "رومیزی سنتی ترمه یزد طرح شاه عباسی",
            Sku = $"SLUG-{Guid.NewGuid():N}",
            Description = "توضیحات تست",
            Price = 3500,
            StockQuantity = 5,
            TableCapacity = 8,
            Length = 220,
            Width = 220,
            FabricType = "ترمه ابریشم",
            LiningType = "ساتن",
            Color = "فیروزه‌ای",
            Pattern = "شاه عباسی",
            CategoryId = category.Id
        });
        var product = (await prodRes.Content.ReadFromJsonAsync<ProductDto>())!;
        Assert.Equal("رومیزی-سنتی-ترمه-یزد-طرح-شاه-عباسی", product.Slug);

        using var publicClient = factory.CreateHttpsClient();
        var lookupBySlug = await publicClient.GetAsync($"/api/products/{Uri.EscapeDataString(product.Slug)}");
        Assert.Equal(HttpStatusCode.OK, lookupBySlug.StatusCode);
        var publicProduct = (await lookupBySlug.Content.ReadFromJsonAsync<PublicProductDto>())!;
        Assert.Equal(product.Id, publicProduct.Id);
        Assert.Equal(product.Slug, publicProduct.Slug);
        Assert.Equal("رومیزی-ابریشم-یزد", publicProduct.CategorySlug);
    }

    [Fact]
    public async Task MediaUpload_OversizedAndInvalidImages_AreRejected()
    {
        using var admin = await factory.CreateAdminClientAsync();

        // 1. Invalid text file disguised as PNG
        var fakePng = Encoding.UTF8.GetBytes("This is not a real image at all.");
        using var fakeForm = new MultipartFormDataContent();
        using var fakeContent = new ByteArrayContent(fakePng);
        fakeContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        fakeForm.Add(fakeContent, "file", "fake.png");
        fakeForm.Add(new StringContent("Fake Image"), "name");
        fakeForm.Add(new StringContent("Alt"), "altText");

        var fakeRes = await admin.PostAsync("/api/admin/cms/media", fakeForm);
        Assert.Equal(HttpStatusCode.BadRequest, fakeRes.StatusCode);

        // 2. Disallowed extension (e.g. .exe)
        var exeBytes = Encoding.UTF8.GetBytes("MZFakeBinaryContent");
        using var exeForm = new MultipartFormDataContent();
        using var exeContent = new ByteArrayContent(exeBytes);
        exeContent.Headers.ContentType = new MediaTypeHeaderValue("application/x-msdownload");
        exeForm.Add(exeContent, "file", "malicious.exe");
        exeForm.Add(new StringContent("Malware"), "name");
        exeForm.Add(new StringContent("Alt"), "altText");

        var exeRes = await admin.PostAsync("/api/admin/cms/media", exeForm);
        Assert.Equal(HttpStatusCode.BadRequest, exeRes.StatusCode);
    }
}
