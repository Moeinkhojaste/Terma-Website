using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Terma.Application.Categories;
using Terma.Application.Common.Models;
using Terma.Application.Customers;
using Terma.Application.Products;
using Terma.Application.Store;
using Terma.Domain.Entities;
using Terma.Infrastructure.Persistence;

namespace Terma.IntegrationTests;

public sealed class CustomerFeaturesApiTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
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

    [Fact]
    public async Task Profile_GetAndUpdate_WorksCorrectly()
    {
        var (client, session, phone) = await CreateAuthenticatedCustomerAsync();

        var profile = await client.GetFromJsonAsync<CustomerProfileDto>("/api/customer/profile");
        Assert.NotNull(profile);
        Assert.Equal(session.UserId, profile.UserId);

        var updateReq = new UpdateProfileRequest { FullName = "سارا محمدی", Email = "sara@example.com" };
        var updateRes = await client.PutAsJsonAsync("/api/customer/profile", updateReq);
        updateRes.EnsureSuccessStatusCode();

        var updated = await updateRes.Content.ReadFromJsonAsync<CustomerProfileDto>();
        Assert.NotNull(updated);
        Assert.Equal("سارا محمدی", updated.FullName);
        Assert.Equal("sara@example.com", updated.Email);
    }

    [Fact]
    public async Task PhoneChange_WithValidOtp_UpdatesAccountPhone()
    {
        var (client, session, _) = await CreateAuthenticatedCustomerAsync();
        var newPhone = $"0935{Random.Shared.Next(1_000_000, 9_999_999)}";

        var otpRes = await client.PostAsJsonAsync("/api/customer/profile/phone/request-otp", new RequestPhoneChangeRequest(newPhone));
        otpRes.EnsureSuccessStatusCode();
        var challenge = (await otpRes.Content.ReadFromJsonAsync<RequestOtpResponse>())!;
        Assert.NotNull(challenge.DevelopmentCode);

        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        var verifyRes = await client.PostAsJsonAsync("/api/customer/profile/phone/verify-otp", new VerifyPhoneChangeRequest(challenge.ChallengeId, challenge.DevelopmentCode!, newPhone));
        verifyRes.EnsureSuccessStatusCode();
        var updatedSession = (await verifyRes.Content.ReadFromJsonAsync<CustomerSessionDto>())!;
        Assert.Equal(session.UserId, updatedSession.UserId);

        var profile = await client.GetFromJsonAsync<CustomerProfileDto>("/api/customer/profile");
        Assert.NotNull(profile);
        Assert.Contains(newPhone.Substring(1), profile.Phone.Replace(" ", ""));
    }

    [Fact]
    public async Task Addresses_CrudAndDefaultSelection_WorksCorrectly()
    {
        var (client, _, _) = await CreateAuthenticatedCustomerAsync();

        // 1. Create first address (should be default automatically)
        var addr1Req = new AddressWriteRequest
        {
            Title = "منزل",
            ReceiverName = "رضا علوی",
            ReceiverPhone = "09121112233",
            Province = "تهران",
            City = "تهران",
            Address = "خیابان ولیعصر، بالاتر از میدان ونک، پلاک ۱۰",
            PostalCode = "1994612345",
            IsDefault = false
        };
        var res1 = await client.PostAsJsonAsync("/api/customer/addresses", addr1Req);
        res1.EnsureSuccessStatusCode();
        var addr1 = (await res1.Content.ReadFromJsonAsync<CustomerAddressDto>())!;
        Assert.True(addr1.IsDefault);

        // 2. Create second address as default
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        var addr2Req = new AddressWriteRequest
        {
            Title = "محل کار",
            ReceiverName = "رضا علوی",
            ReceiverPhone = "09121112233",
            Province = "تهران",
            City = "تهران",
            Address = "خیابان مطهری، پلاک ۲۰",
            PostalCode = "1587654321",
            IsDefault = true
        };
        var res2 = await client.PostAsJsonAsync("/api/customer/addresses", addr2Req);
        res2.EnsureSuccessStatusCode();
        var addr2 = (await res2.Content.ReadFromJsonAsync<CustomerAddressDto>())!;
        Assert.True(addr2.IsDefault);

        // Verify list
        var list = await client.GetFromJsonAsync<IReadOnlyList<CustomerAddressDto>>("/api/customer/addresses");
        Assert.NotNull(list);
        Assert.Equal(2, list.Count);
        Assert.True(list.First(x => x.Id == addr2.Id).IsDefault);
        Assert.False(list.First(x => x.Id == addr1.Id).IsDefault);

        // 3. Set addr1 as default
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        var setDefaultRes = await client.PutAsync($"/api/customer/addresses/{addr1.Id}/default", null);
        setDefaultRes.EnsureSuccessStatusCode();

        var listAfterDefault = await client.GetFromJsonAsync<IReadOnlyList<CustomerAddressDto>>("/api/customer/addresses");
        Assert.True(listAfterDefault!.First(x => x.Id == addr1.Id).IsDefault);
        Assert.False(listAfterDefault!.First(x => x.Id == addr2.Id).IsDefault);

        // 4. Delete addr2
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        var deleteRes = await client.DeleteAsync($"/api/customer/addresses/{addr2.Id}");
        deleteRes.EnsureSuccessStatusCode();

        var listAfterDelete = await client.GetFromJsonAsync<IReadOnlyList<CustomerAddressDto>>("/api/customer/addresses");
        Assert.Single(listAfterDelete!);
    }

    [Fact]
    public async Task Wishlist_ToggleAndList_WorksCorrectly()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var catRes = await admin.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest { Name = $"WishlistCat {Guid.NewGuid():N}" });
        var cat = (await catRes.Content.ReadFromJsonAsync<CategoryDto>())!;
        var prodRes = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest { Name = "Wishlist Product", Sku = $"WISH-{Guid.NewGuid():N}", Description = "desc", Price = 1800, StockQuantity = 5, TableCapacity = 6, Length = 150, Width = 200, FabricType = "Termeh", LiningType = "Satin", Color = "Red", Pattern = "Shah Abbasi", CategoryId = cat.Id });
        var prod = (await prodRes.Content.ReadFromJsonAsync<ProductDto>())!;

        var (client, _, _) = await CreateAuthenticatedCustomerAsync();

        // 1. Check initially not in wishlist
        var ids1 = await client.GetFromJsonAsync<IReadOnlyList<Guid>>("/api/customer/wishlist/ids");
        Assert.DoesNotContain(prod.Id, ids1!);

        // 2. Toggle on (Add)
        var toggle1 = await client.PostAsync($"/api/customer/wishlist/{prod.Id}", null);
        toggle1.EnsureSuccessStatusCode();

        var ids2 = await client.GetFromJsonAsync<IReadOnlyList<Guid>>("/api/customer/wishlist/ids");
        Assert.Contains(prod.Id, ids2!);

        var wishlist = await client.GetFromJsonAsync<IReadOnlyList<WishlistItemDto>>("/api/customer/wishlist");
        Assert.Contains(wishlist!, x => x.ProductId == prod.Id);

        // 3. Toggle off (Remove)
        await TermaApiFactory.SetAntiforgeryHeaderAsync(client);
        var toggle2 = await client.PostAsync($"/api/customer/wishlist/{prod.Id}", null);
        toggle2.EnsureSuccessStatusCode();

        var ids3 = await client.GetFromJsonAsync<IReadOnlyList<Guid>>("/api/customer/wishlist/ids");
        Assert.DoesNotContain(prod.Id, ids3!);
    }

    [Fact]
    public async Task AdminOrder_ChangeStatusWithPostalTrackingCode_VisibleToCustomer()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var catRes = await admin.PostAsJsonAsync("/api/admin/categories", new CreateCategoryRequest { Name = $"TrackingCat {Guid.NewGuid():N}" });
        var cat = (await catRes.Content.ReadFromJsonAsync<CategoryDto>())!;
        var prodRes = await admin.PostAsJsonAsync("/api/admin/products", new CreateProductRequest { Name = "Tracking Product", Sku = $"TRACK-{Guid.NewGuid():N}", Description = "desc", Price = 3000, StockQuantity = 10, TableCapacity = 8, Length = 150, Width = 250, FabricType = "Termeh", LiningType = "Satin", Color = "Gold", Pattern = "Boteh", CategoryId = cat.Id });
        var prod = (await prodRes.Content.ReadFromJsonAsync<ProductDto>())!;

        var (customerClient, _, phone) = await CreateAuthenticatedCustomerAsync();

        // Customer creates order
        customerClient.DefaultRequestHeaders.Add("Idempotency-Key", Guid.NewGuid().ToString());
        var orderRes = await customerClient.PostAsJsonAsync("/api/orders", new CheckoutRequest
        {
            Items = [new CheckoutItemRequest(prod.Id, null, 2)],
            FullName = "مشتری رهگیری",
            Phone = phone,
            Province = "یزد",
            City = "یزد",
            Address = "خیابان کاشانی، کوچه لاله",
            PostalCode = "8916712345"
        });
        orderRes.EnsureSuccessStatusCode();
        var createdOrder = (await orderRes.Content.ReadFromJsonAsync<CreatedOrderDto>())!;

        // Admin updates status to Shipped and enters postal tracking code
        await TermaApiFactory.SetAntiforgeryHeaderAsync(admin);
        var trackingCode = "104820394857201948271029";
        var updateStatusRes = await admin.PutAsJsonAsync($"/api/admin/orders/{createdOrder.Id}/status", new OrderStatusRequest
        {
            Status = OrderStatus.Shipped,
            PostalTrackingCode = trackingCode
        });
        updateStatusRes.EnsureSuccessStatusCode();

        // Customer views order details
        var customerOrder = await customerClient.GetFromJsonAsync<CustomerOrderDetailsDto>($"/api/customer/orders/{createdOrder.Id}");
        Assert.NotNull(customerOrder);
        Assert.Equal(OrderStatus.Shipped, customerOrder.Status);
        Assert.Equal(trackingCode, customerOrder.PostalTrackingCode);

        // Check snapshot pricing: unit price is 3000, line total is 6000
        Assert.Equal(6000, customerOrder.Subtotal);
        Assert.Equal(3000, customerOrder.Items.First().UnitPrice);
    }
}
