using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Terma.Application.Common.Authorization;
using Terma.Application.Common.Models;
using Terma.Application.Customers;

namespace Terma.Api.Controllers;

[ApiController]
[Route("api/customer/orders")]
[Authorize(Policy = CustomerAuthorization.Policy)]
public sealed class CustomerOrdersController(ICustomerAccountService accounts) : ControllerBase
{
    [HttpGet]
    public Task<PagedResult<CustomerOrderSummaryDto>> List([FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default) =>
        accounts.OrdersAsync(CurrentUserId(), page, pageSize, cancellationToken);

    [HttpGet("{id:guid}")]
    public Task<CustomerOrderDetailsDto> Get(Guid id, CancellationToken cancellationToken) =>
        accounts.OrderAsync(CurrentUserId(), id, cancellationToken);

    private Guid CurrentUserId() => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}
