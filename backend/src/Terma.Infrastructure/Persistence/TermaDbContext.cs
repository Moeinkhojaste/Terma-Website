using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Terma.Infrastructure.Identity;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence;

public class TermaDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public TermaDbContext(DbContextOptions<TermaDbContext> options) : base(options)
    {
    }

    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ProductVariant> ProductVariants => Set<ProductVariant>();
    public DbSet<ProductMedia> ProductMedia => Set<ProductMedia>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<CustomerAddress> CustomerAddresses => Set<CustomerAddress>();
    public DbSet<WishlistItem> WishlistItems => Set<WishlistItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<OrderStatusHistory> OrderStatusHistories => Set<OrderStatusHistory>();
    public DbSet<Promotion> Promotions => Set<Promotion>();
    public DbSet<ShippingRule> ShippingRules => Set<ShippingRule>();
    public DbSet<ContactMessage> ContactMessages => Set<ContactMessage>();
    public DbSet<StoreContent> StoreContents => Set<StoreContent>();
    public DbSet<CmsPage> CmsPages => Set<CmsPage>();
    public DbSet<CmsRevision> CmsRevisions => Set<CmsRevision>();
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();
    public DbSet<PhoneOtpChallenge> PhoneOtpChallenges => Set<PhoneOtpChallenge>();
    public DbSet<SecurityAuditEvent> SecurityAuditEvents => Set<SecurityAuditEvent>();
    public DbSet<ProductView> ProductViews => Set<ProductView>();
    public DbSet<CartSession> CartSessions => Set<CartSession>();
    public DbSet<ProductReview> ProductReviews => Set<ProductReview>();
    public DbSet<AdminPasswordResetChallenge> AdminPasswordResetChallenges => Set<AdminPasswordResetChallenge>();
    public DbSet<PaymentTransaction> PaymentTransactions => Set<PaymentTransaction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(TermaDbContext).Assembly);
    }
}
