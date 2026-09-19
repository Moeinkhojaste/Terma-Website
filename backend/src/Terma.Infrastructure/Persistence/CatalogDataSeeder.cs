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
            "termeh-nila-blue",
            "این سفره ترمه با ترکیب رنگ آبی چشم‌نواز و نقش اصیل بته‌جقه، حاصل ساعت‌ها ظرافت در بافت و هنر دست هنرمندان یزد است. تار و پود پرتراکم و استفاده از الیاف ابریشمی بادوام، درخششی ملایم و ماندگار به سطح پارچه بخشیده است.\nلبه‌های اثر با نوار مغزی‌دوزی مستحکم و آستر ساتن ضخیم پوشش یافته‌اند تا روی میز ایستایی کاملی داشته باشد و در طول زمان دچار چروک یا افتادگی نشود."
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
            "termeh-lajvard-navy",
            "سفره ترمه لاجورد با زمینه سرمه‌ای عمیق و لچک‌ترنج‌های طلایی و مسی، اصالت هنر صفوی را در چیدمان‌های امروزی زنده می‌کند. بافت متراکم این اثر در برابر سایش مقاوم است و ثبات رنگ آن در مجاورت نور حفظ می‌شود.\nآسترکشی ساتن مات با دوخت مخفی در چهارگوشه رومیزی، علاوه بر محافظت از بافت پشت ترمه، وزن متعادلی به سفره می‌بخشد تا به نرمی و زیبایی روی میز قرار گیرد."
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
            "termeh-firoozeh-blue",
            "این سفره ترمه فاخر با الهام از نقوش اصیل و ماندگار ترنج و بته‌جقه، جلوه‌ای چشم‌نواز از هنر کهن ایرانی را به نمایش می‌گذارد. تار و پود این اثر با تراکم بافت بالا و استفاده از الیاف ابریشمی درخشان تنیده شده است تا در کنار زیبایی بصری، ماندگاری و استحکام بی‌نظیری را به همراه داشته باشد.\nآستر ساتن مرغوب و مغزی‌دوزی ظریف در لبه‌ها، ایستایی بی‌نقصی به رومیزی بخشیده و آن را به گزینه‌ای ایده‌آل برای پذیرایی‌های رسمی و میزبانی‌های خاص بدل کرده است."
        );

        await db.Products.AddRangeAsync([p1, p2, p3], cancellationToken);
        await db.SaveChangesAsync(cancellationToken);
    }
}
