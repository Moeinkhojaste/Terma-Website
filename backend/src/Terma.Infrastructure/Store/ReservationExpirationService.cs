using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Terma.Domain.Entities;
using Terma.Infrastructure.Persistence;

namespace Terma.Infrastructure.Store;

public sealed class ReservationExpirationService(IServiceScopeFactory scopes, ILogger<ReservationExpirationService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopes.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<TermaDbContext>();
                var now = DateTime.UtcNow;
                var orders = await db.Orders.Include(x => x.Items).Where(x => x.Status == OrderStatus.PendingConfirmation && x.ReservationExpiresAtUtc <= now).ToListAsync(stoppingToken);
                foreach (var order in orders)
                {
                    foreach (var item in order.Items.Where(x => x.VariantId.HasValue))
                    {
                        var variant = await db.ProductVariants.SingleOrDefaultAsync(x => x.Id == item.VariantId, stoppingToken);
                        variant?.ReleaseReservation(item.Quantity);
                        var product = await db.Products.SingleOrDefaultAsync(x => x.Id == item.ProductId, stoppingToken);
                        product?.AdjustStock(item.Quantity);
                    }
                    order.ChangeStatus(OrderStatus.Expired);
                }
                if (orders.Count > 0) await db.SaveChangesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception exception) { logger.LogError(exception, "Failed to expire inventory reservations."); }
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }
}
