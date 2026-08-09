using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Interfaces;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class MediaController(IMediaStorage storage) : ControllerBase
{
    [HttpPost("admin/media")]
    [Authorize(Policy = AdminAuthorization.Policy)]
    [ValidateApiAntiforgeryToken]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<ActionResult<StoredMedia>> Upload(IFormFile file, CancellationToken ct)
    {
        if (file.Length is <= 0 or > 10 * 1024 * 1024) return BadRequest(new ProblemDetails { Title = "Invalid file", Detail = "Image size must be between 1 byte and 10 MB.", Status = 400 });
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new Dictionary<string, (string ContentType, byte[] Magic)>(StringComparer.OrdinalIgnoreCase)
        { [".jpg"] = ("image/jpeg", [0xFF, 0xD8, 0xFF]), [".jpeg"] = ("image/jpeg", [0xFF, 0xD8, 0xFF]), [".png"] = ("image/png", [0x89, 0x50, 0x4E, 0x47]), [".webp"] = ("image/webp", [0x52, 0x49, 0x46, 0x46]) };
        if (!allowed.TryGetValue(extension, out var rule) || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)) return BadRequest(new ProblemDetails { Title = "Invalid image", Detail = "Only JPEG, PNG and WebP images are allowed.", Status = 400 });
        await using var input = file.OpenReadStream();
        var header = new byte[8]; var read = await input.ReadAsync(header, ct);
        if (read < rule.Magic.Length || !header.AsSpan(0, rule.Magic.Length).SequenceEqual(rule.Magic)) return BadRequest(new ProblemDetails { Title = "Invalid image", Detail = "The file content does not match its extension.", Status = 400 });
        input.Position = 0;
        return Ok(await storage.SaveAsync(input, rule.ContentType, extension, ct));
    }

    [HttpGet("media/{key}")]
    [AllowAnonymous]
    public async Task<IActionResult> Read(string key, CancellationToken ct)
    {
        var stream = await storage.OpenReadAsync(Path.GetFileName(key), ct);
        return stream is null ? NotFound() : File(stream, ContentType(Path.GetExtension(key)), enableRangeProcessing: true);
    }

    private static string ContentType(string extension) => extension.ToLowerInvariant() switch { ".jpg" or ".jpeg" => "image/jpeg", ".png" => "image/png", ".webp" => "image/webp", _ => "application/octet-stream" };
}
