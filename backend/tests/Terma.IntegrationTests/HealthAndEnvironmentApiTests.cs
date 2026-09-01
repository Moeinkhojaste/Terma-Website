using System.Net;
using System.Text.Json;
using Xunit;

namespace Terma.IntegrationTests;

public class HealthAndEnvironmentApiTests : IClassFixture<TermaApiFactory>
{
    private readonly TermaApiFactory _factory;

    public HealthAndEnvironmentApiTests(TermaApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task LivenessCheck_Returns200AndHealthyStatus()
    {
        var client = _factory.CreateHttpsClient();

        var response = await client.GetAsync("/health/live");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        var content = await response.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(content);
        var status = jsonDoc.RootElement.GetProperty("status").GetString();
        Assert.Equal("Healthy", status);
    }

    [Fact]
    public async Task ReadinessCheck_Returns200AndHealthyStatus()
    {
        var client = _factory.CreateHttpsClient();

        var response = await client.GetAsync("/health/ready");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/json", response.Content.Headers.ContentType?.MediaType);

        var content = await response.Content.ReadAsStringAsync();
        using var jsonDoc = JsonDocument.Parse(content);
        var status = jsonDoc.RootElement.GetProperty("status").GetString();
        Assert.Equal("Healthy", status);
    }
}
