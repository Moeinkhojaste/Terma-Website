using Microsoft.AspNetCore.Mvc;
using Terma.Application.Store;
using Terma.Api.ErrorHandling;
using Microsoft.AspNetCore.RateLimiting;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/store")]
public sealed class StoreController(IStoreOperationsService service) : ControllerBase
{
    [HttpGet("content")]
    public Task<IReadOnlyList<StoreContentDto>> Content([FromQuery] string? page, CancellationToken ct) => service.ContentAsync(page, false, ct);

    [HttpPost("messages")]
    [EnableRateLimiting("public-write")]
    [ValidateApiAntiforgeryToken]
    public Task<ContactMessageDto> CreateMessage(ContactMessageWriteRequest request, CancellationToken ct) => service.CreateMessageAsync(request, ct);
}
