using System.Net;
using System.Net.Http.Json;
using Terma.Application.Categories;
using Terma.Application.Common.Models;
using Terma.Application.Customers;
using Terma.Application.Products;
using Terma.Application.Reviews;
using Terma.Domain.Entities;

namespace Terma.IntegrationTests;

public sealed class ProductReviewsApiTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    private async Task<(HttpClient client, CustomerSessionDto session, string phone)> CreateAuthenticatedCustomerAsync()
    {
        var phone = $"0912{Random.Shared.Next(1_000_000, 9_999_999)}";
        var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        var otpResponse = await client.PostAsJsonAsync("/api/customer-auth/otp/request", new RequestOtpRequest(phone));
        otpResponse.EnsureSuccessStatusCode();
        var challenge = (await otpResponse.Content.ReadFromJsonAsync<RequestOtpResponse>())!;

        var verifyResponse = await client.PostAsJsonAsync("/api/customer-auth/otp/verify", new VerifyOtpRequest(challenge.ChallengeId, challenge.DevelopmentCode!));
        verifyResponse.EnsureSuccessStatusCode();
        var session = (await verifyResponse.Content.ReadFromJsonAsync<CustomerSessionDto>())!;

        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        return (client, session, phone);
    }

    private async Task<(ProductDto product, CategoryDto category)> CreateTestProductAsync()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var catRes = await admin.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest { Name = $"ReviewCat {Guid.NewGuid():N}" });
        var cat = (await catRes.Content.ReadFromJsonAsync<CategoryDto>())!;
        var prodRes = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest
        {
            Name = $"Review Test Product {Guid.NewGuid():N}",
            Sku = $"REV-{Guid.NewGuid():N}",
            Description = "desc",
            Price = 2500,
            StockQuantity = 10,
            TableCapacity = 6,
            Length = 150,
            Width = 200,
            FabricType = "Termeh",
            LiningType = "Satin",
            Color = "Blue",
            Pattern = "Paisley",
            CategoryId = cat.Id
        });
        var prod = (await prodRes.Content.ReadFromJsonAsync<ProductDto>())!;
        return (prod, cat);
    }

    [Fact]
    public async Task SubmitReview_UnauthenticatedUser_ReturnsUnauthorized()
    {
        var (prod, _) = await CreateTestProductAsync();
        var anonymousClient = factory.CreateClient();

        var res = await anonymousClient.PostAsJsonAsync("/api/customer/reviews", new CreateReviewRequest
        {
            ProductId = prod.Id,
            Rating = 5,
            Title = "تست مهمان",
            Comment = "کاربر مهمان نباید بتواند بدون لاگین نظر ثبت کند."
        });

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Reviews_FullLifecycle_FromSubmissionToModerationAndPublicDisplay()
    {
        var (prod, _) = await CreateTestProductAsync();
        var (customerClient, session, phone) = await CreateAuthenticatedCustomerAsync();

        // 1. Initial public reviews should be 0
        var publicClient = factory.CreateClient();
        var initialSummary = await publicClient.GetFromJsonAsync<ProductReviewsSummaryDto>($"/api/products/{prod.Id}/reviews");
        Assert.NotNull(initialSummary);
        Assert.Equal(0, initialSummary.TotalReviewsCount);
        Assert.Equal(0.0, initialSummary.AverageRating);

        // 2. Customer submits a review (rating = 5)
        var submitRes = await customerClient.PostAsJsonAsync("/api/customer/reviews", new CreateReviewRequest
        {
            ProductId = prod.Id,
            Rating = 5,
            Title = "فوق‌العاده زیبا",
            Comment = "کیفیت پارچه و دوخت ترمه بی‌نظیر بود."
        });
        submitRes.EnsureSuccessStatusCode();
        var customerReview = (await submitRes.Content.ReadFromJsonAsync<CustomerReviewDto>())!;
        Assert.Equal(ReviewStatus.Pending, customerReview.Status);
        Assert.Equal(5, customerReview.Rating);

        // 3. Customer checks their own reviews list and product review check
        var myReviews = await customerClient.GetFromJsonAsync<IReadOnlyList<CustomerReviewDto>>("/api/customer/reviews");
        Assert.NotNull(myReviews);
        Assert.Contains(myReviews, r => r.ProductId == prod.Id && r.Status == ReviewStatus.Pending);

        var myProdReview = await customerClient.GetFromJsonAsync<CustomerReviewDto>($"/api/customer/reviews/products/{prod.Id}/my-review");
        Assert.NotNull(myProdReview);
        Assert.Equal(5, myProdReview.Rating);

        // 4. Public endpoint must STILL show 0 reviews because it's not approved yet
        var pendingSummary = await publicClient.GetFromJsonAsync<ProductReviewsSummaryDto>($"/api/products/{prod.Id}/reviews");
        Assert.Equal(0, pendingSummary!.TotalReviewsCount);

        // 5. Admin lists pending reviews and approves the review
        using var admin = await factory.CreateAdminClientAsync();
        var adminPendingList = await admin.GetFromJsonAsync<PagedResult<AdminProductReviewDto>>($"/api/admin/reviews?status={ReviewStatus.Pending}&productId={prod.Id}");
        Assert.NotNull(adminPendingList);
        var targetReview = Assert.Single(adminPendingList.Items);
        Assert.Equal(customerReview.Id, targetReview.Id);

        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        var approveRes = await admin.PutAsync($"/api/admin/reviews/{targetReview.Id}/approve", null);
        approveRes.EnsureSuccessStatusCode();

        // 6. Admin adds an official reply
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        var replyRes = await admin.PutAsJsonAsync($"/api/admin/reviews/{targetReview.Id}/reply", new AdminReplyReviewRequest
        {
            Response = "با سپاس از حسن انتخاب شما، رضایت شما هدف ماست."
        });
        replyRes.EnsureSuccessStatusCode();

        // 7. Public endpoint now displays 1 approved review, 5.0 avg rating, and admin reply!
        var approvedSummary = await publicClient.GetFromJsonAsync<ProductReviewsSummaryDto>($"/api/products/{prod.Id}/reviews");
        Assert.NotNull(approvedSummary);
        Assert.Equal(1, approvedSummary.TotalReviewsCount);
        Assert.Equal(5.0, approvedSummary.AverageRating);
        Assert.Equal(1, approvedSummary.Distribution.FiveStars);
        Assert.Equal(0, approvedSummary.Distribution.FourStars);

        var publicReview = Assert.Single(approvedSummary.Reviews.Items);
        Assert.Equal("فوق‌العاده زیبا", publicReview.Title);
        Assert.Equal("با سپاس از حسن انتخاب شما، رضایت شما هدف ماست.", publicReview.AdminResponse);
    }
}
