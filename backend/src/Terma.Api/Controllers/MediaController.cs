using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Cms;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Interfaces;
using Terma.Infrastructure.Media;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api")]
public sealed class MediaController(
    IMediaStorage storage,
    ICmsService cms,
    ISecurityAuditService auditService) : ControllerBase
{
    [HttpGet("admin/cms/media")]
    [Authorize(Policy = AdminAuthorization.Policy)]
    public Task<IReadOnlyList<MediaAssetDto>> List([FromQuery] string? search, CancellationToken ct) =>
        cms.ListMediaAsync(search, ct);

    [HttpPost("admin/cms/media")]
    [Authorize(Policy = AdminAuthorization.Policy)]
    [ValidateApiAntiforgeryToken]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<ActionResult<MediaAssetDto>> Upload(
        IFormFile file,
        [FromForm] string? name,
        [FromForm] string? altText,
        CancellationToken ct)
    {
        if (file is null || file.Length <= 0 || file.Length > ImageSanitizer.MaxFileSize)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid file size",
                Detail = "Image size must be between 1 byte and 10 MB.",
                Status = 400
            });
        }

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        using var memoryStream = new MemoryStream();
        await file.CopyToAsync(memoryStream, ct);
        var buffer = memoryStream.ToArray();

        var (isValid, error, width, height, contentType) = ImageSanitizer.ValidateAndInspect(buffer, extension);
        if (!isValid)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid image",
                Detail = error ?? "The image file is invalid.",
                Status = 400
            });
        }

        using var saveStream = new MemoryStream(buffer);
        var stored = await storage.SaveAsync(saveStream, contentType, extension, ct);

        try
        {
            var title = string.IsNullOrWhiteSpace(name) ? Path.GetFileNameWithoutExtension(file.FileName) : name;
            var alternative = string.IsNullOrWhiteSpace(altText) ? title : altText;
            var registered = await cms.RegisterMediaAsync(stored.Key, stored.PublicUrl, title!, alternative!, stored.ContentType, stored.Length, ct);

            await auditService.LogAsync(GetActor(), "UploadMedia", stored.Key, $"Success ({width}x{height})", HttpContext.TraceIdentifier, GetClientIp(), ct);
            return Ok(registered);
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
    public async Task<MediaAssetDto> Update(Guid id, UpdateMediaAssetRequest request, CancellationToken ct)
    {
        var result = await cms.UpdateMediaAsync(id, request, ct);
        await auditService.LogAsync(GetActor(), "UpdateMedia", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return result;
    }

    [HttpDelete("admin/cms/media/{id:guid}")]
    [Authorize(Policy = AdminAuthorization.Policy)]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await cms.DeleteMediaAsync(id, ct);
        await auditService.LogAsync(GetActor(), "DeleteMedia", id.ToString(), "Success", HttpContext.TraceIdentifier, GetClientIp(), ct);
        return NoContent();
    }

    [HttpGet("media/{key}")]
    [AllowAnonymous]
    public async Task<IActionResult> Read(string key, CancellationToken ct)
    {
        var sanitizedKey = Path.GetFileName(key);
        var stream = await storage.OpenReadAsync(sanitizedKey, ct);
        if (stream is null) return NotFound();

        Response.Headers["X-Content-Type-Options"] = "nosniff";
        Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
        return File(stream, ContentType(Path.GetExtension(sanitizedKey)), enableRangeProcessing: true);
    }

    private static string ContentType(string extension) => extension.ToLowerInvariant() switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".webp" => "image/webp",
        _ => "application/octet-stream"
    };

    private string GetActor() => User.Identity?.Name ?? "admin";

    private string? GetClientIp()
    {
        var forwarded = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(forwarded)
            ? forwarded.Split(',')[0].Trim()
            : HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
