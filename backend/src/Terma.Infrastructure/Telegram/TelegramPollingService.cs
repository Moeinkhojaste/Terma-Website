using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Terma.Application.Telegram;

namespace Terma.Infrastructure.Telegram;

public sealed class TelegramPollingService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IOptionsMonitor<TelegramOptions> _optionsMonitor;
    private readonly ILogger<TelegramPollingService> _logger;

    public TelegramPollingService(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        IOptionsMonitor<TelegramOptions> optionsMonitor,
        ILogger<TelegramPollingService> logger)
    {
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _optionsMonitor = optionsMonitor;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Wait a few seconds on startup to let the rest of the application bootstrap
        await Task.Delay(2000, stoppingToken);

        long lastOffset = 0;
        var client = _httpClientFactory.CreateClient("TelegramBotClient");

        while (!stoppingToken.IsCancellationRequested)
        {
            var options = _optionsMonitor.CurrentValue;

            if (!options.IsConfigured || !options.UsePolling)
            {
                await Task.Delay(5000, stoppingToken);
                continue;
            }

            try
            {
                // Ensure webhook is cleared before polling if we haven't done so yet
                if (lastOffset == 0)
                {
                    try
                    {
                        var deleteWebhookUrl = $"https://api.telegram.org/bot{options.BotToken}/deleteWebhook";
                        await client.PostAsJsonAsync(deleteWebhookUrl, new { drop_pending_updates = false }, stoppingToken);
                        _logger.LogInformation("Telegram webhook cleared. Long polling active for bot.");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug(ex, "Initial Telegram deleteWebhook call failed (will continue polling).");
                    }
                }

                var getUpdatesUrl = $"https://api.telegram.org/bot{options.BotToken}/getUpdates";
                var payload = new
                {
                    offset = lastOffset > 0 ? (long?)lastOffset : null,
                    timeout = 25,
                    allowed_updates = new[] { "message", "callback_query" }
                };

                using var response = await client.PostAsJsonAsync(getUpdatesUrl, payload, stoppingToken);
                if (response.IsSuccessStatusCode)
                {
                    var apiResult = await response.Content.ReadFromJsonAsync<TelegramApiResponse<List<TelegramUpdate>>>(cancellationToken: stoppingToken);
                    if (apiResult?.Ok == true && apiResult.Result is not null)
                    {
                        foreach (var update in apiResult.Result)
                        {
                            lastOffset = update.UpdateId + 1;

                            try
                            {
                                using var scope = _scopeFactory.CreateScope();
                                var updateHandler = scope.ServiceProvider.GetRequiredService<ITelegramUpdateHandler>();
                                await updateHandler.HandleUpdateAsync(update, stoppingToken);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Error processing Telegram update {UpdateId}", update.UpdateId);
                            }
                        }
                    }
                }
                else
                {
                    var error = await response.Content.ReadAsStringAsync(stoppingToken);
                    _logger.LogWarning("Telegram getUpdates returned {StatusCode}: {Error}", response.StatusCode, error);
                    await Task.Delay(5000, stoppingToken);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Transient error during Telegram bot long polling. Retrying in 5 seconds...");
                try
                {
                    await Task.Delay(5000, stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
            }
        }
    }
}
