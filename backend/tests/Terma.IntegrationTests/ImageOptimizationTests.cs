using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Terma.Application.Cms;
using Terma.Infrastructure.Media;
using Xunit;

namespace Terma.IntegrationTests;

public sealed class ImageOptimizationTests(TermaApiFactory factory) : IClassFixture<TermaApiFactory>
{
    private static readonly System.Text.Json.JsonSerializerOptions JsonOptions = new(System.Text.Json.JsonSerializerDefaults.Web);

    [Fact]
    public async Task ImageOptimizer_ConvertsPngToWebp_Successfully()
    {
        var optimizer = new ImageOptimizer();
        // 1x1 base64 png
        var pngBytes = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
        using var stream = new MemoryStream(pngBytes);

        var result = await optimizer.OptimizeToWebpAsync(stream, quality: 85);

        Assert.NotNull(result);
        Assert.Equal("image/webp", result.ContentType);
        Assert.Equal(".webp", result.Extension);
        Assert.True(result.Width > 0);
        Assert.True(result.Height > 0);
        Assert.True(result.Data.Length > 0);
    }

    [Fact]
    public async Task AdminUpload_AutomaticallyConvertsImageToWebp()
    {
        using var admin = await factory.CreateAdminClientAsync();
        var png = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=");
        using var form = new MultipartFormDataContent();
        using var image = new ByteArrayContent(png);
        image.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(image, "file", "uploaded-banner.png");
        form.Add(new StringContent("Banner Upload"), "name");
        form.Add(new StringContent("Alt for banner"), "altText");

        var upload = await admin.PostAsync("/api/admin/cms/media", form);
        Assert.Equal(HttpStatusCode.OK, upload.StatusCode);

        var asset = (await upload.Content.ReadFromJsonAsync<MediaAssetDto>(JsonOptions))!;
        Assert.NotNull(asset);
        Assert.EndsWith(".webp", asset.PublicUrl, StringComparison.OrdinalIgnoreCase);
        Assert.Equal("image/webp", asset.ContentType);

        // Read media back
        var readResponse = await admin.GetAsync(asset.PublicUrl);
        Assert.Equal(HttpStatusCode.OK, readResponse.StatusCode);
        Assert.Equal("image/webp", readResponse.Content.Headers.ContentType?.MediaType);
    }
}
