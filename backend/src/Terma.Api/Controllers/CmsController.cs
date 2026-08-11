using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Cms;
using Terma.Application.Common.Authorization;
using Terma.Domain.Entities;

namespace Terma.Api.Controllers;

[ApiController]
[Authorize(Policy = AdminAuthorization.Policy)]
[Route("api/admin/cms")]
public sealed class CmsController(ICmsService service) : ControllerBase
{
    [HttpGet("pages")]
    public Task<IReadOnlyList<CmsPageSummaryDto>> Pages([FromQuery] string? search, [FromQuery] CmsPageStatus? status, CancellationToken ct) =>
        service.ListPagesAsync(search, status, ct);

    [HttpGet("pages/{id:guid}")]
    public async Task<ActionResult<CmsPageDetailDto>> Page(Guid id, CancellationToken ct) => WithEtag(await service.GetPageAsync(id, ct));

    [HttpPost("pages")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CmsPageDetailDto>> Create(CreateCmsPageRequest request, CancellationToken ct)
    {
        var page = await service.CreatePageAsync(request, Actor, ct);
        Response.Headers.ETag = page.RowVersion;
        return CreatedAtAction(nameof(Page), new { id = page.Id }, page);
    }

    [HttpPut("pages/{id:guid}/draft")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CmsPageDetailDto>> Save(Guid id, SaveCmsDraftRequest request, CancellationToken ct) =>
        WithEtag(await service.SaveDraftAsync(id, request, IfMatch, Actor, ct));

    [HttpPost("pages/{id:guid}/publish")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CmsPageDetailDto>> Publish(Guid id, CancellationToken ct) =>
        WithEtag(await service.PublishAsync(id, IfMatch, Actor, ct));

    [HttpPost("pages/{id:guid}/schedule")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CmsPageDetailDto>> Schedule(Guid id, ScheduleCmsPageRequest request, CancellationToken ct) =>
        WithEtag(await service.ScheduleAsync(id, request, IfMatch, Actor, ct));

    [HttpGet("pages/{id:guid}/revisions")]
    public Task<IReadOnlyList<CmsRevisionDto>> Revisions(Guid id, CancellationToken ct) => service.RevisionsAsync(id, ct);

    [HttpPost("pages/{id:guid}/revisions/{revisionId:guid}/restore")]
    [ValidateApiAntiforgeryToken]
    public async Task<ActionResult<CmsPageDetailDto>> Restore(Guid id, Guid revisionId, CancellationToken ct) =>
        WithEtag(await service.RestoreAsync(id, revisionId, IfMatch, Actor, ct));

    [HttpDelete("pages/{id:guid}")]
    [ValidateApiAntiforgeryToken]
    public async Task<IActionResult> Archive(Guid id, CancellationToken ct)
    {
        await service.ArchiveAsync(id, IfMatch, ct);
        return NoContent();
    }

    private string Actor => User.Identity?.Name ?? "admin";
    private string IfMatch => Request.Headers.IfMatch.ToString();

    private ActionResult<CmsPageDetailDto> WithEtag(CmsPageDetailDto page)
    {
        Response.Headers.ETag = page.RowVersion;
        return Ok(page);
    }
}

[ApiController]
[AllowAnonymous]
[Route("api/store/cms")]
public sealed class PublicCmsController(ICmsService service) : ControllerBase
{
    [HttpGet("site")]
    public Task<CmsPublishedPageDto> Site(CancellationToken ct) => service.GetPublishedSiteAsync(ct);

    [HttpGet("pages/{slug}")]
    public Task<CmsPublishedPageDto> Page(string slug, CancellationToken ct) => service.GetPublishedPageAsync(slug, ct);
}
