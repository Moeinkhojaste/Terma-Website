using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using Terma.Application.Cms;
using Terma.Domain.Entities;

namespace Terma.IntegrationTests;

public sealed class CmsApiTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web) { Converters = { new JsonStringEnumConverter() } };
    [Fact]
    public async Task Draft_IsPrivate_ThenPublishMakesItPublic_AndConcurrencyIsEnforced()
    {
        using var anonymous = factory.CreateHttpsClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/admin/cms/pages")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await anonymous.GetAsync("/api/store/cms/pages/home")).StatusCode);

        using var admin = await factory.CreateAdminClientAsync();
        var create = await admin.PostAsJsonAsync("/api/admin/cms/pages", new CreateCmsPageRequest { Slug = $"test-{Guid.NewGuid():N}", Name = "Test page" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var page = (await create.Content.ReadFromJsonAsync<CmsPageDetailDto>(JsonOptions))!;
        Assert.Equal(HttpStatusCode.NotFound, (await anonymous.GetAsync($"/api/store/cms/pages/{page.Slug}")).StatusCode);

        var body = new SaveCmsDraftRequest { Name = page.Name, Slug = page.Slug, Document = Document("Published title") };
        var conflict = await SendAsync(admin, HttpMethod.Put, $"/api/admin/cms/pages/{page.Id}/draft", body, "\"999\"");
        Assert.Equal(HttpStatusCode.PreconditionFailed, conflict.StatusCode);

        var save = await SendAsync(admin, HttpMethod.Put, $"/api/admin/cms/pages/{page.Id}/draft", body, page.RowVersion);
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);
        page = (await save.Content.ReadFromJsonAsync<CmsPageDetailDto>(JsonOptions))!;
        var publish = await SendAsync(admin, HttpMethod.Post, $"/api/admin/cms/pages/{page.Id}/publish", null, page.RowVersion);
        Assert.Equal(HttpStatusCode.OK, publish.StatusCode);
        var publicPage = await anonymous.GetFromJsonAsync<CmsPublishedPageDto>($"/api/store/cms/pages/{page.Slug}");
        Assert.Equal("Published title", publicPage!.Document.Seo.Title);
    }

    [Fact]
    public async Task ScheduledPage_PublishesOnlyWhenDue()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var created = (await (await admin.PostAsJsonAsync("/api/admin/cms/pages", new CreateCmsPageRequest { Slug = $"schedule-{Guid.NewGuid():N}", Name = "Scheduled" })).Content.ReadFromJsonAsync<CmsPageDetailDto>(JsonOptions))!;
        var due = factory.Clock.GetUtcNow().AddMinutes(10).UtcDateTime;
        var schedule = await SendAsync(admin, HttpMethod.Post, $"/api/admin/cms/pages/{created.Id}/schedule", new ScheduleCmsPageRequest { PublishAtUtc = due }, created.RowVersion);
        Assert.Equal(HttpStatusCode.OK, schedule.StatusCode);
        using var scope = factory.Services.CreateScope();
        var service = scope.ServiceProvider.GetRequiredService<ICmsService>();
        await service.PublishScheduledAsync(due.AddSeconds(-1), default);
        Assert.Equal(HttpStatusCode.NotFound, (await factory.CreateHttpsClient().GetAsync($"/api/store/cms/pages/{created.Slug}")).StatusCode);
        await service.PublishScheduledAsync(due, default);
        Assert.Equal(HttpStatusCode.OK, (await factory.CreateHttpsClient().GetAsync($"/api/store/cms/pages/{created.Slug}")).StatusCode);
    }

    [Fact]
    public async Task SystemPage_CannotBeArchived()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var pages = await admin.GetFromJsonAsync<List<CmsPageSummaryDto>>("/api/admin/cms/pages", JsonOptions);
        var home = pages!.Single(x => x.Slug == "home");
        var response = await SendAsync(admin, HttpMethod.Delete, $"/api/admin/cms/pages/{home.Id}", null, home.RowVersion);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Revision_CanBeRestoredAsANewDraft()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var created = (await (await admin.PostAsJsonAsync("/api/admin/cms/pages", new CreateCmsPageRequest { Slug = $"restore-{Guid.NewGuid():N}", Name = "Restore" })).Content.ReadFromJsonAsync<CmsPageDetailDto>(JsonOptions))!;

        var firstSave = await SendAsync(admin, HttpMethod.Put, $"/api/admin/cms/pages/{created.Id}/draft", new SaveCmsDraftRequest { Name = created.Name, Slug = created.Slug, Document = Document("First version") }, created.RowVersion);
        var page = (await firstSave.Content.ReadFromJsonAsync<CmsPageDetailDto>(JsonOptions))!;
        var publish = await SendAsync(admin, HttpMethod.Post, $"/api/admin/cms/pages/{page.Id}/publish", null, page.RowVersion);
        page = (await publish.Content.ReadFromJsonAsync<CmsPageDetailDto>(JsonOptions))!;
        var publishedRevisionId = page.PublishedRevisionId!.Value;

        var secondSave = await SendAsync(admin, HttpMethod.Put, $"/api/admin/cms/pages/{page.Id}/draft", new SaveCmsDraftRequest { Name = page.Name, Slug = page.Slug, Document = Document("Second version") }, page.RowVersion);
        page = (await secondSave.Content.ReadFromJsonAsync<CmsPageDetailDto>(JsonOptions))!;
        var restore = await SendAsync(admin, HttpMethod.Post, $"/api/admin/cms/pages/{page.Id}/revisions/{publishedRevisionId}/restore", null, page.RowVersion);

        Assert.Equal(HttpStatusCode.OK, restore.StatusCode);
        var restored = (await restore.Content.ReadFromJsonAsync<CmsPageDetailDto>(JsonOptions))!;
        Assert.Equal("First version", restored.Document.Seo.Title);
        var revisions = await admin.GetFromJsonAsync<List<CmsRevisionDto>>($"/api/admin/cms/pages/{page.Id}/revisions", JsonOptions);
        Assert.Equal(4, revisions!.Count);
        Assert.True(revisions[0].IsDraft);
    }

    [Fact]
    public async Task Media_CanBeManaged_ButCannotBeDeletedWhileUsedByDraft()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
        using var form = new MultipartFormDataContent();
        using var image = new ByteArrayContent(png);
        image.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(image, "file", "cms-test.png");
        form.Add(new StringContent("CMS test"), "name");
        form.Add(new StringContent("Test alternative text"), "altText");
        var upload = await admin.PostAsync("/api/admin/cms/media", form);
        Assert.Equal(HttpStatusCode.OK, upload.StatusCode);
        var asset = (await upload.Content.ReadFromJsonAsync<MediaAssetDto>(JsonOptions))!;

        var update = await admin.PutAsJsonAsync($"/api/admin/cms/media/{asset.Id}", new UpdateMediaAssetRequest { Name = "Updated media", AltText = "Updated alt" });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var listed = await admin.GetFromJsonAsync<List<MediaAssetDto>>("/api/admin/cms/media?search=Updated", JsonOptions);
        Assert.Contains(listed!, x => x.Id == asset.Id && x.AltText == "Updated alt");

        var created = (await (await admin.PostAsJsonAsync("/api/admin/cms/pages", new CreateCmsPageRequest { Slug = $"media-{Guid.NewGuid():N}", Name = "Media page" })).Content.ReadFromJsonAsync<CmsPageDetailDto>(JsonOptions))!;
        var document = new CmsDocumentDto
        {
            Seo = new() { Title = "Media page", Description = "Media page description" },
            Blocks = [new CmsBlockDto { Id = Guid.NewGuid().ToString(), Type = "imageText", Data = JsonSerializer.SerializeToElement(new { title = "Image", text = "Text", imageUrl = asset.PublicUrl, imageAlt = "Updated alt" }) }]
        };
        var save = await SendAsync(admin, HttpMethod.Put, $"/api/admin/cms/pages/{created.Id}/draft", new SaveCmsDraftRequest { Name = created.Name, Slug = created.Slug, Document = document }, created.RowVersion);
        Assert.Equal(HttpStatusCode.OK, save.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.DeleteAsync($"/api/admin/cms/media/{asset.Id}")).StatusCode);

        var page = (await save.Content.ReadFromJsonAsync<CmsPageDetailDto>(JsonOptions))!;
        Assert.Equal(HttpStatusCode.NoContent, (await SendAsync(admin, HttpMethod.Delete, $"/api/admin/cms/pages/{page.Id}", null, page.RowVersion)).StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, (await admin.DeleteAsync($"/api/admin/cms/media/{asset.Id}")).StatusCode);
    }

    private static CmsDocumentDto Document(string title) => new() { Seo = new() { Title = title, Description = "Description" }, Blocks = [] };

    private static async Task<HttpResponseMessage> SendAsync(HttpClient client, HttpMethod method, string url, object? body, string etag)
    {
        using var request = new HttpRequestMessage(method, url);
        request.Headers.TryAddWithoutValidation("If-Match", etag);
        if (body is not null) request.Content = JsonContent.Create(body);
        return await client.SendAsync(request);
    }
}
