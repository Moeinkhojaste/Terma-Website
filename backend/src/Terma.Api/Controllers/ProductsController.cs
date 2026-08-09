using Microsoft.AspNetCore.Mvc;
using Terma.Application.Products.Dtos;
using Terma.Application.Products.Queries;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IGetProductsQuery _getProductsQuery;

    public ProductsController(IGetProductsQuery getProductsQuery)
    {
        _getProductsQuery = getProductsQuery;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProductDto>>> GetProducts(CancellationToken cancellationToken)
    {
        var products = await _getProductsQuery.ExecuteAsync(cancellationToken);
        return Ok(products);
    }
}
