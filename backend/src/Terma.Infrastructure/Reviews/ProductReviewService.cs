using Microsoft.EntityFrameworkCore;
using Terma.Application.Common.Exceptions;
using Terma.Application.Common.Models;
using Terma.Application.Reviews;
using Terma.Domain.Entities;
using Terma.Domain.Services;
using Terma.Infrastructure.Persistence;

namespace Terma.Infrastructure.Reviews;

public sealed class ProductReviewService(TermaDbContext dbContext) : IProductReviewService
{
    public async Task<ProductReviewsSummaryDto> GetProductReviewsSummaryAsync(
        string productIdentifier,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 20;

        var product = await FindProductByIdentifierAsync(productIdentifier, cancellationToken);
        if (product == null)
        {
            throw new NotFoundException("محصول مورد نظر یافت نشد.");
        }

        var query = dbContext.ProductReviews.AsNoTracking()
            .Where(r => r.ProductId == product.Id && r.Status == ReviewStatus.Approved);

        var ratings = await query.Select(r => r.Rating).ToListAsync(cancellationToken);
        var totalCount = ratings.Count;
        var avgRating = totalCount > 0 ? Math.Round(ratings.Average(), 1) : 0.0;

        var dist = new RatingDistributionDto(
            OneStar: ratings.Count(r => r == 1),
            TwoStars: ratings.Count(r => r == 2),
            ThreeStars: ratings.Count(r => r == 3),
            FourStars: ratings.Count(r => r == 4),
            FiveStars: ratings.Count(r => r == 5));

        var pagedItems = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new ProductReviewDto(
                r.Id,
                r.ProductId,
                r.CustomerName,
                r.Rating,
                r.Title,
                r.Comment,
                r.AdminResponse,
                r.CreatedAt))
            .ToListAsync(cancellationToken);

        var pagedResult = new PagedResult<ProductReviewDto>(pagedItems, page, pageSize, totalCount);

        return new ProductReviewsSummaryDto(avgRating, totalCount, dist, pagedResult);
    }

    public async Task<CustomerReviewDto> SubmitReviewAsync(
        Guid userId,
        CreateReviewRequest request,
        CancellationToken cancellationToken)
    {
        var customer = await dbContext.Customers
            .FirstOrDefaultAsync(c => c.UserId == userId, cancellationToken);

        if (customer == null)
        {
            throw new NotFoundException("پروفایل مشتری یافت نشد.");
        }

        var product = await dbContext.Products
            .Include(p => p.Media)
            .FirstOrDefaultAsync(p => p.Id == request.ProductId && p.IsActive, cancellationToken);

        if (product == null)
        {
            throw new NotFoundException("محصول مورد نظر یافت نشد یا غیرفعال است.");
        }

        var existing = await dbContext.ProductReviews
            .FirstOrDefaultAsync(r => r.UserId == userId && r.ProductId == request.ProductId, cancellationToken);

        if (existing != null)
        {
            existing.Update(request.Rating, request.Title, request.Comment);
            await dbContext.SaveChangesAsync(cancellationToken);
            return MapToCustomerReviewDto(existing, product);
        }

        var customerName = !string.IsNullOrWhiteSpace(customer.FullName) ? customer.FullName : "کاربر ترما";
        var review = new ProductReview(
            request.ProductId,
            customer.Id,
            userId,
            customerName,
            request.Rating,
            request.Title,
            request.Comment);

        await dbContext.ProductReviews.AddAsync(review, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToCustomerReviewDto(review, product);
    }

    public async Task<IReadOnlyList<CustomerReviewDto>> GetCustomerReviewsAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        var reviews = await dbContext.ProductReviews.AsNoTracking()
            .Include(r => r.Product)
            .ThenInclude(p => p.Media)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(cancellationToken);

        return reviews.Select(r => MapToCustomerReviewDto(r, r.Product)).ToList();
    }

    public async Task<CustomerReviewDto?> GetCustomerProductReviewAsync(
        Guid userId,
        Guid productId,
        CancellationToken cancellationToken)
    {
        var review = await dbContext.ProductReviews.AsNoTracking()
            .Include(r => r.Product)
            .ThenInclude(p => p.Media)
            .FirstOrDefaultAsync(r => r.UserId == userId && r.ProductId == productId, cancellationToken);

        return review == null ? null : MapToCustomerReviewDto(review, review.Product);
    }

    public async Task<PagedResult<AdminProductReviewDto>> GetAdminReviewsAsync(
        AdminReviewListRequest request,
        CancellationToken cancellationToken)
    {
        var query = dbContext.ProductReviews.AsNoTracking()
            .Include(r => r.Product)
            .Include(r => r.Customer)
            .AsQueryable();

        if (request.Status.HasValue)
        {
            query = query.Where(r => r.Status == request.Status.Value);
        }

        if (request.ProductId.HasValue)
        {
            query = query.Where(r => r.ProductId == request.ProductId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var term = request.Search.Trim();
            query = query.Where(r =>
                r.CustomerName.Contains(term)
                || r.Comment.Contains(term)
                || (r.Title != null && r.Title.Contains(term))
                || r.Product.Name.Contains(term)
                || r.Customer.Phone.Contains(term));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var page = request.Page < 1 ? 1 : request.Page;
        var pageSize = request.PageSize < 1 || request.PageSize > 100 ? 20 : request.PageSize;

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new AdminProductReviewDto(
                r.Id,
                r.ProductId,
                r.Product.Name,
                r.Product.Slug,
                r.CustomerId,
                r.CustomerName,
                r.Customer.Phone,
                r.Rating,
                r.Title,
                r.Comment,
                r.Status,
                r.AdminResponse,
                r.RejectionReason,
                r.CreatedAt,
                r.UpdatedAt))
            .ToListAsync(cancellationToken);

        return new PagedResult<AdminProductReviewDto>(items, page, pageSize, totalCount);
    }

    public async Task<AdminProductReviewDto> ApproveReviewAsync(
        Guid reviewId,
        CancellationToken cancellationToken)
    {
        var review = await dbContext.ProductReviews
            .Include(r => r.Product)
            .Include(r => r.Customer)
            .FirstOrDefaultAsync(r => r.Id == reviewId, cancellationToken);

        if (review == null)
        {
            throw new NotFoundException("نظر مورد نظر یافت نشد.");
        }

        review.Approve();
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToAdminReviewDto(review);
    }

    public async Task<AdminProductReviewDto> RejectReviewAsync(
        Guid reviewId,
        string? reason,
        CancellationToken cancellationToken)
    {
        var review = await dbContext.ProductReviews
            .Include(r => r.Product)
            .Include(r => r.Customer)
            .FirstOrDefaultAsync(r => r.Id == reviewId, cancellationToken);

        if (review == null)
        {
            throw new NotFoundException("نظر مورد نظر یافت نشد.");
        }

        review.Reject(reason);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToAdminReviewDto(review);
    }

    public async Task<AdminProductReviewDto> ReplyReviewAsync(
        Guid reviewId,
        string response,
        CancellationToken cancellationToken)
    {
        var review = await dbContext.ProductReviews
            .Include(r => r.Product)
            .Include(r => r.Customer)
            .FirstOrDefaultAsync(r => r.Id == reviewId, cancellationToken);

        if (review == null)
        {
            throw new NotFoundException("نظر مورد نظر یافت نشد.");
        }

        review.SetAdminResponse(response);
        await dbContext.SaveChangesAsync(cancellationToken);

        return MapToAdminReviewDto(review);
    }

    public async Task DeleteReviewAsync(
        Guid reviewId,
        CancellationToken cancellationToken)
    {
        var review = await dbContext.ProductReviews
            .FirstOrDefaultAsync(r => r.Id == reviewId, cancellationToken);

        if (review == null)
        {
            throw new NotFoundException("نظر مورد نظر یافت نشد.");
        }

        dbContext.ProductReviews.Remove(review);
        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private async Task<Product?> FindProductByIdentifierAsync(string identifier, CancellationToken cancellationToken)
    {
        if (Guid.TryParse(identifier, out var id))
        {
            var byId = await dbContext.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id, cancellationToken);
            if (byId != null) return byId;
        }

        var normalizedSlug = PersianSlugHelper.NormalizeSlug(identifier);
        return await dbContext.Products.AsNoTracking().FirstOrDefaultAsync(p => p.Slug == normalizedSlug, cancellationToken);
    }

    private static CustomerReviewDto MapToCustomerReviewDto(ProductReview review, Product product)
    {
        var primaryImage = product.Media.OrderBy(m => m.SortOrder).FirstOrDefault()?.PublicUrl;
        return new CustomerReviewDto(
            review.Id,
            review.ProductId,
            product.Name,
            product.Slug,
            primaryImage,
            review.Rating,
            review.Title,
            review.Comment,
            review.Status,
            review.AdminResponse,
            review.RejectionReason,
            review.CreatedAt,
            review.UpdatedAt);
    }

    private static AdminProductReviewDto MapToAdminReviewDto(ProductReview review)
    {
        return new AdminProductReviewDto(
            review.Id,
            review.ProductId,
            review.Product.Name,
            review.Product.Slug,
            review.CustomerId,
            review.CustomerName,
            review.Customer.Phone,
            review.Rating,
            review.Title,
            review.Comment,
            review.Status,
            review.AdminResponse,
            review.RejectionReason,
            review.CreatedAt,
            review.UpdatedAt);
    }
}
