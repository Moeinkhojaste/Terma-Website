using Microsoft.AspNetCore.Mvc;
using Terma.Application.Common.Models;
using Terma.Application.Products;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/products")]
public sealed class ProductsController(IProductService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<PublicProductDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<PublicProductDto>>> List(
        [FromQuery] ProductListRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await service.ListPublicAsync(request, cancellationToken));
    }

    [HttpGet("facets")]
    [ProducesResponseType<ProductFacetsDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ProductFacetsDto>> Facets(CancellationToken cancellationToken) =>
        Ok(await service.FacetsAsync(cancellationToken));

    [HttpGet("lookup")]
    [ProducesResponseType<IReadOnlyList<PublicProductDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<PublicProductDto>>> Lookup(
        [FromQuery] Guid[] ids,
        CancellationToken cancellationToken) =>
        Ok(await service.LookupPublicAsync(ids, cancellationToken));

    [HttpGet("{identifier}/recommendations")]
    [ProducesResponseType<IReadOnlyList<PublicProductDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<PublicProductDto>>> Recommendations(
        string identifier,
        [FromQuery] Guid? variantId,
        [FromQuery] int limit = 4,
        CancellationToken cancellationToken = default) =>
        Ok(await service.RecommendationsPublicAsync(identifier, variantId, limit, cancellationToken));

    [HttpGet("{identifier}")]
    [ProducesResponseType<PublicProductDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicProductDto>> GetProduct(string identifier, CancellationToken cancellationToken)
    {
        return Ok(await service.GetPublicByIdOrSlugAsync(identifier, cancellationToken));
    }
}
