using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Terma.IntegrationTests;

public class HealthApiTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthApiTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GetHealth_ReturnsSuccessAndHealthyStatus()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Healthy", content);
    }
}
