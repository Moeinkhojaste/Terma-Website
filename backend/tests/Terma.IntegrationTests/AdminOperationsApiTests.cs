using System.Net;
using System.Net.Http.Json;
using Terma.Application.Store;
using Terma.Domain.Entities;

namespace Terma.IntegrationTests;

public sealed class AdminOperationsApiTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    [Fact]
    public async Task Promotions_Crud_LifecycleWorks()
    {
        using var admin = await factory.CreateAdminClientAsync();

        // 1. Create Coupon Promotion
        var createReq = new PromotionWriteRequest
        {
            Name = "تخفیف ویژه بهاره",
            Code = $"SPRING-{Guid.NewGuid():N}"[..12],
            Type = PromotionType.Coupon,
            DiscountType = DiscountType.Percentage,
            Value = 15,
            MinimumSubtotal = 100_000,
            MaximumDiscount = 50_000,
            UsageLimit = 20,
            StartsAtUtc = DateTime.UtcNow.AddMinutes(-5),
            EndsAtUtc = DateTime.UtcNow.AddDays(30),
            IsActive = true
        };
        var createRes = await admin.PostAsJsonAsync("/api/admin/promotions", createReq);
        createRes.EnsureSuccessStatusCode();
        var created = (await createRes.Content.ReadFromJsonAsync<PromotionDto>())!;
        Assert.NotNull(created);
        Assert.Equal("تخفیف ویژه بهاره", created.Name);

        // 2. List promotions
        var list = await admin.GetFromJsonAsync<List<PromotionDto>>("/api/admin/promotions");
        Assert.NotNull(list);
        Assert.Contains(list, x => x.Id == created.Id);

        // 3. Update promotion
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        var updateReq = new PromotionWriteRequest
        {
            Name = "تخفیف بهاره ویرایش شده",
            Code = created.Code,
            Type = PromotionType.Coupon,
            DiscountType = DiscountType.Percentage,
            Value = 25,
            MinimumSubtotal = 150_000,
            MaximumDiscount = 75_000,
            UsageLimit = 50,
            StartsAtUtc = DateTime.UtcNow.AddMinutes(-5),
            EndsAtUtc = DateTime.UtcNow.AddDays(45),
            IsActive = true
        };
        var updateRes = await admin.PutAsJsonAsync($"/api/admin/promotions/{created.Id}", updateReq);
        updateRes.EnsureSuccessStatusCode();

        // 4. Delete promotion (soft delete sets IsActive to false)
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        var deleteRes = await admin.DeleteAsync($"/api/admin/promotions/{created.Id}");
        deleteRes.EnsureSuccessStatusCode();

        var listAfterDelete = await admin.GetFromJsonAsync<List<PromotionDto>>("/api/admin/promotions");
        var deletedPromo = listAfterDelete!.First(x => x.Id == created.Id);
        Assert.False(deletedPromo.IsActive);
    }

    [Fact]
    public async Task ShippingRules_Crud_LifecycleWorks()
    {
        using var admin = await factory.CreateAdminClientAsync();

        // 1. Create Shipping Rule
        var createReq = new ShippingRuleWriteRequest
        {
            Name = "ارسال سریع استان یزد",
            Province = "یزد",
            City = null,
            Cost = 35_000,
            FreeAboveSubtotal = 400_000,
            Priority = 5,
            IsActive = true
        };
        var createRes = await admin.PostAsJsonAsync("/api/admin/shipping-rules", createReq);
        createRes.EnsureSuccessStatusCode();
        var created = (await createRes.Content.ReadFromJsonAsync<ShippingRuleDto>())!;
        Assert.NotNull(created);
        Assert.Equal("ارسال سریع استان یزد", created.Name);

        // 2. List Shipping Rules
        var list = await admin.GetFromJsonAsync<List<ShippingRuleDto>>("/api/admin/shipping-rules");
        Assert.NotNull(list);
        Assert.Contains(list, x => x.Id == created.Id);

        // 3. Update Shipping Rule
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        var updateReq = new ShippingRuleWriteRequest
        {
            Name = "ارسال رایگان ویژه یزد",
            Province = "یزد",
            City = "یزد",
            Cost = 0,
            FreeAboveSubtotal = 0,
            Priority = 10,
            IsActive = true
        };
        var updateRes = await admin.PutAsJsonAsync($"/api/admin/shipping-rules/{created.Id}", updateReq);
        updateRes.EnsureSuccessStatusCode();

        // 4. Delete Shipping Rule (soft delete sets IsActive to false)
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        var deleteRes = await admin.DeleteAsync($"/api/admin/shipping-rules/{created.Id}");
        deleteRes.EnsureSuccessStatusCode();

        var listAfterDelete = await admin.GetFromJsonAsync<List<ShippingRuleDto>>("/api/admin/shipping-rules");
        var deletedRule = listAfterDelete!.First(x => x.Id == created.Id);
        Assert.False(deletedRule.IsActive);
    }

    [Fact]
    public async Task ContactMessages_AdminCanListAndChangeStatus()
    {
        using var client = factory.CreateHttpsClient();
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);

        // 1. Send contact message anonymously
        var msgReq = new ContactMessageWriteRequest
        {
            Name = "سهراب سپهری",
            Phone = "09121113355",
            Email = "sohrab@example.com",
            Topic = "طرح سفارشی",
            Body = "آیا امکان بافت ترمه با طرح سفارشی وجود دارد؟"
        };
        var sendRes = await client.PostAsJsonAsync("/api/store/messages", msgReq);
        sendRes.EnsureSuccessStatusCode();

        // 2. Admin retrieves messages
        using var admin = await factory.CreateAdminClientAsync();
        var messages = await admin.GetFromJsonAsync<List<ContactMessageDto>>("/api/admin/messages");
        Assert.NotNull(messages);
        var targetMsg = messages.FirstOrDefault(x => x.Name == "سهراب سپهری");
        Assert.NotNull(targetMsg);
        Assert.Equal(ContactMessageStatus.New, targetMsg.Status);

        // 3. Admin marks as read / replied
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        var updateRes = await admin.PutAsJsonAsync($"/api/admin/messages/{targetMsg.Id}/status", new { status = "Replied" });
        updateRes.EnsureSuccessStatusCode();

        var updatedMessages = await admin.GetFromJsonAsync<List<ContactMessageDto>>("/api/admin/messages");
        var updatedMsg = updatedMessages!.First(x => x.Id == targetMsg.Id);
        Assert.Equal(ContactMessageStatus.Replied, updatedMsg.Status);
    }

    [Fact]
    public async Task AdminAnalytics_ComprehensiveMetrics_ReturnsExpectedData()
    {
        using var admin = await factory.CreateAdminClientAsync();

        // 1. Get Analytics
        var res = await admin.GetAsync("/api/admin/analytics");
        var content = await res.Content.ReadAsStringAsync();
        Assert.True(res.IsSuccessStatusCode, $"Analytics API failed: {res.StatusCode} - {content}");
        var analytics = System.Text.Json.JsonSerializer.Deserialize<AdminAnalyticsDto>(content, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        Assert.NotNull(analytics);
        Assert.NotNull(analytics.Sales);
        Assert.NotNull(analytics.Registrations);
        Assert.NotNull(analytics.AbandonedCarts);
        Assert.NotEmpty(analytics.DailyTrend30Days);
        Assert.Equal(30, analytics.DailyTrend30Days.Count);
        Assert.NotEmpty(analytics.MonthlyTrend1Year);
        Assert.Equal(12, analytics.MonthlyTrend1Year.Count);
        Assert.NotEmpty(analytics.OrderStatusBreakdown);

        // 2. Get Abandoned Carts report
        var abandoned = await admin.GetFromJsonAsync<AbandonedCartsReportDto>("/api/admin/abandoned-carts");
        Assert.NotNull(abandoned);

        // 3. Get Loyal Customers
        var loyal = await admin.GetFromJsonAsync<List<LoyalCustomerDto>>("/api/admin/loyal-customers");
        Assert.NotNull(loyal);

        // 4. Get Top Selling Products
        var topSelling = await admin.GetFromJsonAsync<List<TopSellingProductDto>>("/api/admin/products/top-selling?days=30&limit=5");
        Assert.NotNull(topSelling);

        // 5. Get Top Viewed Products
        var topViewed = await admin.GetFromJsonAsync<List<TopViewedProductDto>>("/api/admin/products/top-viewed?days=30&limit=5");
        Assert.NotNull(topViewed);
    }

    [Fact]
    public async Task ProductViews_And_CartSync_TrackCorrectly()
    {
        using var client = factory.CreateHttpsClient();

        // 1. Record product view
        var randomId = Guid.NewGuid();
        var viewRes = await client.PostAsync($"/api/products/{randomId}/view", null);
        Assert.Equal(HttpStatusCode.NoContent, viewRes.StatusCode);

        // 2. Sync Cart Session
        var syncReq = new SyncCartSessionRequest
        {
            SessionKey = $"test-session-{Guid.NewGuid():N}",
            CustomerName = "کاربر تستی سبد",
            Phone = "09129998877",
            Items = new List<CartSyncItemRequest>
            {
                new(randomId, null, "محصول تستی رها شده", "SKU-TEST", 250_000, 2)
            }
        };
        var syncRes = await client.PostAsJsonAsync("/api/store/cart/sync", syncReq);
        Assert.Equal(HttpStatusCode.NoContent, syncRes.StatusCode);
    }
}
