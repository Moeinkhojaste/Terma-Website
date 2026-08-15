using Microsoft.AspNetCore.Mvc;
using Terma.Application.Categories;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/categories")]
public sealed class CategoriesController(ICategoryService service) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<PublicCategoryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<PublicCategoryDto>>> List(CancellationToken cancellationToken = default)
    {
        return Ok(await service.ListPublicAsync(cancellationToken));
    }

    [HttpGet("{identifier}")]
    [ProducesResponseType<PublicCategoryDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PublicCategoryDto>> GetCategory(string identifier, CancellationToken cancellationToken)
    {
        return Ok(await service.GetPublicByIdOrSlugAsync(identifier, cancellationToken));
    }
}
