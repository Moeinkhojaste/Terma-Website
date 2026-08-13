using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Api.ErrorHandling;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Models;
using Terma.Application.Products;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/products")]
public sealed class ProductsController(IProductService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<PagedResult<ProductDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<ProductDto>>> List(
        [FromQuery] ProductListRequest request,
        CancellationToken cancellationToken)
    {
        // Anonymous storefront requests must never be able to opt into drafts.
        // Admin users can explicitly request inactive products for management.
        if (!(User.Identity?.IsAuthenticated ?? false))
        {
            request = new ProductListRequest
            {
                CategoryId = request.CategoryId,
                MinPrice = request.MinPrice,
                MaxPrice = request.MaxPrice,
                TableCapacity = request.TableCapacity,
                Color = request.Color,
                InStock = request.InStock,
                IsActive = true,
                Search = request.Search,
                Page = request.Page,
                PageSize = request.PageSize
            };
        }
        return Ok(await service.ListAsync(request, cancellationToken));
    }

    [HttpGet("facets")]
    [ProducesResponseType<ProductFacetsDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<ProductFacetsDto>> Facets(CancellationToken cancellationToken) =>
        Ok(await service.FacetsAsync(cancellationToken));

    [HttpGet("lookup")]
    [ProducesResponseType<IReadOnlyList<ProductDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> Lookup(
        [FromQuery] Guid[] ids,
        CancellationToken cancellationToken) =>
        Ok(await service.LookupAsync(ids, cancellationToken));

    [HttpGet("{id:guid}/recommendations")]
    [ProducesResponseType<IReadOnlyList<ProductDto>>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyList<ProductDto>>> Recommendations(
        Guid id,
        [FromQuery] Guid? variantId,
        [FromQuery] int limit = 4,
        CancellationToken cancellationToken = default) =>
        Ok(await service.RecommendationsAsync(id, variantId, limit, cancellationToken));

    [HttpGet("{id:guid}", Name = nameof(GetProduct))]
    [ProducesResponseType<ProductDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ProductDto>> GetProduct(Guid id, CancellationToken cancellationToken)
    {
        return Ok(await service.GetAsync(id, cancellationToken));
    }

    [HttpPost]
    [Authorize(Policy = AdminAuthorization.Policy)]
    [ValidateApiAntiforgeryToken]
    [ProducesResponseType<ProductDto>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductDto>> Create(
        CreateProductRequest request,
        CancellationToken cancellationToken)
    {
        var product = await service.CreateAsync(request, cancellationToken);
        return CreatedAtRoute(nameof(GetProduct), new { id = product.Id }, product);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AdminAuthorization.Policy)]
    [ValidateApiAntiforgeryToken]
    [ProducesResponseType<ProductDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<ProductDto>> Update(
        Guid id,
        UpdateProductRequest request,
        CancellationToken cancellationToken)
    {
        return Ok(await service.UpdateAsync(id, request, cancellationToken));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AdminAuthorization.Policy)]
    [ValidateApiAntiforgeryToken]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        await service.DeleteAsync(id, cancellationToken);
        return NoContent();
    }
}
