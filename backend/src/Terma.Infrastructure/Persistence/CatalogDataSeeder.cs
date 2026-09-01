using Microsoft.EntityFrameworkCore;
using Terma.Domain.Entities;

namespace Terma.Infrastructure.Persistence;

public sealed class CatalogDataSeeder(TermaDbContext db)
{
    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (await db.Products.AnyAsync(cancellationToken)) return;

        var category = await db.Categories.FirstOrDefaultAsync(c => c.Slug == "termeh-tablecloth", cancellationToken);
        if (category is null)
        {
            category = new Category("سفره ترمه", "مجموعه سفره‌های اصیل ترمه ایرانی با دوخت دقیق و آستر ساتن", true, "termeh-tablecloth");
            await db.Categories.AddAsync(category, cancellationToken);
            await db.SaveChangesAsync(cancellationToken);
        }

        var p1 = new Product(
            "سفره ترمه نیلا",
            "TER-NIL-BLU-4P-001",
            "سفره ترمه نیلا با زمینه آبی و نقوش بته‌جقه ظریف، مناسب برای میزهای ۴ نفره و پذیرایی خانوادگی.",
            1450000m,
            15,
            4,
            100m,
            100m,
            "ترمه ابریشمی",
            "ساتن",
            "آبی",
            "بته‌جقه",
            category.Id,
            null,
            true,
            "termeh-nila-blue"
        );

        var p2 = new Product(
            "سفره ترمه لاجورد",
            "TER-LAJ-NVY-6P-001",
            "سفره ترمه لاجورد با زمینه سرمه‌ای و حاشیه مسی، گزینه‌ای اصیل برای میزهای ۶ نفره و دکوراسیون کلاسیک.",
            2150000m,
            12,
            6,
            160m,
            110m,
            "ترمه ابریشمی",
            "ساتن",
            "سرمه‌ای",
            "افشان و بته‌جقه",
            category.Id,
            null,
            true,
            "termeh-lajvard-navy"
        );

        var p3 = new Product(
            "سفره ترمه فیروزه",
            "TER-FIR-BLU-8P-001",
            "سفره ترمه فیروزه با ترکیب رنگ‌های فیروزه‌ای و طلایی، طراحی شده برای میزهای ۸ نفره و مجالس ویژه.",
            2850000m,
            8,
            8,
            240m,
            110m,
            "ترمه ابریشمی",
            "ساتن",
            "فیروزه‌ای",
            "ترنج و بته‌جقه",
            category.Id,
            10,
            true,
            "termeh-firoozeh-blue"
        );

        await db.Products.AddRangeAsync([p1, p2, p3], cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }
}
