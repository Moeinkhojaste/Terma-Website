using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Interfaces;
using Terma.Application.Cms;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class MediaController(IMediaStorage storage, ICmsService cms) : ControllerBase
{
    [HttpGet("admin/cms/media")]
    [Authorize(Policy = AdminAuthorization.Policy)]
    public Task<IReadOnlyList<MediaAssetDto>> List([FromQuery] string? search, CancellationToken ct) => cms.ListMediaAsync(search, ct);

    [HttpPost("admin/cms/media")]
    [Authorize(Policy = AdminAuthorization.Policy)]
    [ValidateApiAntiforgeryToken]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<ActionResult<MediaAssetDto>> Upload(IFormFile file, [FromForm] string? name, [FromForm] string? altText, CancellationToken ct)
    {
        if (file.Length is <= 0 or > 10 * 1024 * 1024) return BadRequest(new ProblemDetails { Title = "Invalid file", Detail = "Image size must be between 1 byte and 10 MB.", Status = 400 });
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var allowed = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        { [".jpg"] = "image/jpeg", [".jpeg"] = "image/jpeg", [".png"] = "image/png", [".webp"] = "image/webp" };
        if (!allowed.TryGetValue(extension, out var contentType) || !file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase)) return BadRequest(new ProblemDetails { Title = "Invalid image", Detail = "Only JPEG, PNG and WebP images are allowed.", Status = 400 });
        await using var input = file.OpenReadStream();
        var header = new byte[12]; var read = await input.ReadAsync(header, ct);
        var valid = extension switch
        {
            ".jpg" or ".jpeg" => read >= 3 && header.AsSpan(0, 3).SequenceEqual(new byte[] { 0xFF, 0xD8, 0xFF }),
            ".png" => read >= 8 && header.AsSpan(0, 8).SequenceEqual(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),
            ".webp" => read >= 12 && header.AsSpan(0, 4).SequenceEqual("RIFF"u8) && header.AsSpan(8, 4).SequenceEqual("WEBP"u8),
            _ => false
        };
        if (!valid) return BadRequest(new ProblemDetails { Title = "Invalid image", Detail = "The file content does not match its extension.", Status = 400 });
        input.Position = 0;
        var stored = await storage.SaveAsync(input, contentType, extension, ct);
        try
        {
            var title = string.IsNullOrWhiteSpace(name) ? Path.GetFileNameWithoutExtension(file.FileName) : name;
            var alternative = string.IsNullOrWhiteSpace(altText) ? title : altText;
            return Ok(await cms.RegisterMediaAsync(stored.Key, stored.PublicUrl, title!, alternative!, stored.ContentType, stored.Length, ct));
        }
        catch
        {
            await storage.DeleteAsync(stored.Key, ct);
            throw;
        }
    }

    [HttpPut("admin/cms/media/{id:guid}")]
    [Authorize(Policy = AdminAuthorization.Policy)]
    [ValidateApiAntiforgeryToken]
    public Task<MediaAssetDto> Update(Guid id, UpdateMediaAssetRequest request, CancellationToken ct) => cms.UpdateMediaAsync(id, request, ct);

    [HttpDelete("admin/cms/media/{id:guid}")]
    [Authorize(Policy = AdminAuthorization.Policy)]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await cms.DeleteMediaAsync(id, ct);
        return NoContent();
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
