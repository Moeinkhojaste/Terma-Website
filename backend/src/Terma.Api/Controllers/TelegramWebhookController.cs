using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Terma.Application.Telegram;
using Terma.Infrastructure.Telegram;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/telegram")]
public sealed class TelegramWebhookController : ControllerBase
{
    private readonly ITelegramUpdateHandler _updateHandler;
    private readonly TelegramOptions _options;
    private readonly ILogger<TelegramWebhookController> _logger;

    public TelegramWebhookController(
        ITelegramUpdateHandler updateHandler,
        IOptions<TelegramOptions> options,
        ILogger<TelegramWebhookController> logger)
    {
        _updateHandler = updateHandler;
        _options = options.Value;
        _logger = logger;
    }

    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook(
        [FromBody] TelegramUpdate update,
        [FromHeader(Name = "X-Telegram-Bot-Api-Secret-Token")] string? secretToken,
        CancellationToken ct)
    {
        // 1. Verify Webhook Secret Token if configured
        if (!string.IsNullOrWhiteSpace(_options.WebhookSecret))
        {
            if (string.IsNullOrWhiteSpace(secretToken) || !string.Equals(secretToken, _options.WebhookSecret, StringComparison.Ordinal))
            {
                _logger.LogWarning("Rejected Telegram webhook request with invalid secret token.");
                return Unauthorized();
            }
        }

        try
        {
            await _updateHandler.HandleUpdateAsync(update, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled error in Telegram webhook update handler.");
        }

        // Always return 200 OK to Telegram so it doesn't repeatedly retry failed updates
        return Ok();
    }
}
