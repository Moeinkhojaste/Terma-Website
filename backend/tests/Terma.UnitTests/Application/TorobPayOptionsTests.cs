using Terma.Application.Payments;

namespace Terma.UnitTests.Application;

public sealed class TorobPayOptionsTests
{
    [Fact]
    public void ResolvedCredentials_BlankConfiguration_FallBackToBuiltInMerchantDefaults()
    {
        var options = new TorobPayOptions
        {
            ClientId = "",
            ClientSecret = "   ",
            Username = "\t",
            Password = null!
        };

        Assert.Equal(TorobPayDefaults.ClientId, options.ResolvedClientId);
        Assert.Equal(TorobPayDefaults.ClientSecret, options.ResolvedClientSecret);
        Assert.Equal(TorobPayDefaults.Username, options.ResolvedUsername);
        Assert.Equal(TorobPayDefaults.Password, options.ResolvedPassword);
    }

    [Fact]
    public void ResolvedConfiguration_QuotedAndInvisibleCharacters_AreRemoved()
    {
        var options = new TorobPayOptions
        {
            ClientId = "\"28941414\"",
            ClientSecret = "\u202b20qQevRPn8RdofXm50nvRRwhZ3QEIQRpxq4B7boUm0PeLhDbLI3ebVXKHmQXlsihJ6zCGb\u202c",
            Username = "\u200b \"termabrand.ir\" \ufeff",
            Password = "GaK2hMFUunFUVFkmLPLx\u200e"
        };

        Assert.Equal("28941414", options.ResolvedClientId);
        Assert.Equal(TorobPayDefaults.ClientSecret, options.ResolvedClientSecret);
        Assert.Equal("termabrand.ir", options.ResolvedUsername);
        Assert.Equal("GaK2hMFUunFUVFkmLPLx", options.ResolvedPassword);
    }

    [Fact]
    public void ResolvedCredentials_BlankConfigurationButEnvironmentSet_UsesEnvironmentValue()
    {
        const string variableName = "TOROB_USERNAME";
        var previous = Environment.GetEnvironmentVariable(variableName);
        Environment.SetEnvironmentVariable(variableName, "env-user");

        try
        {
            var options = new TorobPayOptions { Username = "", Password = "keep-me" };

            Assert.Equal("env-user", options.ResolvedUsername);
            Assert.Equal("keep-me", options.ResolvedPassword);
        }
        finally
        {
            Environment.SetEnvironmentVariable(variableName, previous);
        }
    }

    [Fact]
    public void ResolvedBaseUrl_PlainHttp_IsUpgradedToHttps()
    {
        var options = new TorobPayOptions { BaseUrl = "http://cpg.torobpay.com/" };

        Assert.Equal("https://cpg.torobpay.com", options.ResolvedBaseUrl);
        Assert.Equal("https://cpg.torobpay.com/api/online/v1/oauth/token", options.GetTokenUrl());
        Assert.Equal("https://cpg.torobpay.com/api/online/payment/v1/token", options.GetPaymentTokenUrl());
    }

    [Fact]
    public void ResolvedBaseUrl_LoopbackHttp_IsKeptForLocalDevelopment()
    {
        var options = new TorobPayOptions { BaseUrl = "http://localhost:9000/" };

        Assert.Equal("http://localhost:9000", options.ResolvedBaseUrl);
    }

    [Fact]
    public void DescribeForDiagnostics_OmitsSecretsButReportsTheirPresence()
    {
        var description = new TorobPayOptions().DescribeForDiagnostics();

        Assert.DoesNotContain(TorobPayDefaults.Password, description);
        Assert.DoesNotContain(TorobPayDefaults.ClientSecret, description);
        Assert.Contains($"passwordLength={TorobPayDefaults.Password.Length}", description);
        Assert.Contains($"clientSecretLength={TorobPayDefaults.ClientSecret.Length}", description);
        Assert.Contains($"username={TorobPayDefaults.Username}", description);
        Assert.Contains("source=configuration", description);
    }
}
