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
}
