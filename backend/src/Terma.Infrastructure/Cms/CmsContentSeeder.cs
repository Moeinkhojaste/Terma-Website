using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Terma.Application.Cms;
using Terma.Domain.Entities;
using Terma.Infrastructure.Persistence;

namespace Terma.Infrastructure.Cms;

public sealed class CmsContentSeeder(TermaDbContext db)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (await db.CmsPages.AnyAsync(cancellationToken)) return;
        var legacy = await db.StoreContents.AsNoTracking().ToListAsync(cancellationToken);

        await AddAsync("site-settings", "تنظیمات عمومی سایت", true, new CmsDocumentDto
        {
            Seo = new() { Title = "ترما | سفره‌های ترمه ایرانی", Description = "سفره‌های ترمه با نقش ایرانی، دوخت دقیق و آستر ساتن." },
            Blocks =
            [
                Block("announcement", new { text = Legacy("home", "announcement", "نقش ایرانی، دوخت دقیق، برای خانه امروز", body: true) }),
                Block("linkList", new { title = "منوی اصلی", placement = "header", items = new[] { new { label = "محصولات", href = "/products" }, new { label = "درباره ما", href = "/about" }, new { label = "ارتباط با ما", href = "/contact" } } }),
                Block("contactInfo", new { brandName = "ترما", tagline = Legacy("common", "footer_tagline", "سفره‌های ترمه برای خانه‌های ایرانی امروز", body: true), email = "info@terma.ir", phone = "", instagramUrl = "", responseHours = "شنبه تا چهارشنبه، ۹ تا ۱۸", logoUrl = "/images/terma-logo.jpeg" }),
                Block("linkList", new { title = "لینک‌های فوتر", placement = "footer", items = new[] { new { label = "راهنمای خرید", href = "/#راهنمای-خرید" }, new { label = "درباره ما", href = "/about" }, new { label = "ارتباط با ما", href = "/contact" }, new { label = "حریم خصوصی", href = "/privacy" } } })
            ]
        });

        await AddAsync("home", "صفحه اصلی", true, new CmsDocumentDto
        {
            Seo = new() { Title = "ترما | سفره‌های ترمه ایرانی", Description = "سفره‌های ترمه با نقش ایرانی، دوخت دقیق و آستر ساتن در ظرفیت‌های چهار، شش و هشت نفره." },
            Blocks =
            [
                Block("hero", new { eyebrow = "ترمه، برای خانه امروز", title = Legacy("home", "hero", "نقش ایرانی، در خانه شما"), text = Legacy("home", "hero", "سفره‌های ترمه با آستر ساتن و لبه‌دوزی دقیق؛ برای پهن‌کردن روی میز یا روی زمین.", true), imageUrl = "/images/firoozeh-folded.jpeg", imageAlt = "سفره ترمه فیروزه", primaryLabel = "دیدن محصولات", primaryHref = "/products", secondaryLabel = "راهنمای انتخاب", secondaryHref = "/#راهنمای-خرید" }),
                Block("categoryLinks", new { eyebrow = "دسته‌بندی", title = "انتخاب بر اساس ظرفیت", items = new[] { new { label = "۴ نفره", href = "/products?tableCapacity=4" }, new { label = "۶ نفره", href = "/products?tableCapacity=6" }, new { label = "۸ نفره", href = "/products?tableCapacity=8" } } }),
                Block("productShowcase", new { eyebrow = "مجموعه ترما", title = "منتخب‌های ترما", text = "سه محصول از مجموعه فعلی را ببینید.", count = 3 }),
                Block("featureGrid", new { eyebrow = "آنچه در محصول می‌بینید", title = Legacy("home", "values", "جزئیات روشن، بدون ادعای اضافه"), text = Legacy("home", "values", "", true), items = new[] { new { title = "نقش ایرانی", text = "بته‌جقه و نقوش ریز سنتی، با ترکیب رنگ مناسب خانه‌های امروزی." }, new { title = "دوخت منظم", text = "لبه‌دوزی یکپارچه و نوار کرم‌طلایی در چهار طرف سفره." }, new { title = "آستر ساتن", text = "پشت هر سفره با ساتن هم‌رنگ آستر شده است." } } }),
                Block("imageText", new { eyebrow = "از نزدیک", title = Legacy("home", "craft", "بافت، لبه و آستر؛ سه جزئی که دیده می‌شوند"), text = Legacy("home", "craft", "جزئیات بافت، لبه‌دوزی و آستر را از نزدیک ببینید.", true), imageUrl = "/images/nila-folded.jpeg", imageAlt = "نمای نزدیک بافت سفره ترمه", imageSide = "right" }),
                Block("featureGrid", new { eyebrow = "پیش از انتخاب", title = Legacy("home", "guide", "اندازه درست را پیدا کنید"), text = Legacy("home", "guide", "فضای استفاده را اندازه بگیرید و با ابعاد محصول مقایسه کنید.", true), anchor = "راهنمای-خرید", items = new[] { new { title = "فضا را اندازه بگیرید", text = "طول و عرض فضای موردنظر را یادداشت کنید." }, new { title = "ابعاد را مقایسه کنید", text = "اندازه محصول را با فضای خود مقایسه کنید." }, new { title = "ظرفیت را انتخاب کنید", text = "از میان ظرفیت‌های ۴، ۶ و ۸ نفره انتخاب کنید." } } })
            ]
        });

        await AddAsync("about", "درباره ما", true, new CmsDocumentDto
        {
            Seo = new() { Title = "درباره ترما", Description = "داستان و ارزش‌های فروشگاه ترما." },
            Blocks =
            [
                Block("hero", new { eyebrow = "درباره ترما", title = Legacy("about", "intro", "نقش‌های آشنا، برای زندگی امروز"), text = Legacy("about", "intro", "ترما فروشگاهی برای انتخاب روشن و ساده سفره‌های ترمه است.", true), imageUrl = "/images/lajvard-table.png", imageAlt = "سفره ترمه لاجورد روی میز", primaryLabel = "دیدن محصولات", primaryHref = "/products" }),
                Block("richText", new { eyebrow = "داستان ما", title = Legacy("about", "story", "میان اصالت و سادگی"), text = Legacy("about", "story", "تجربه خرید ترمه باید ساده، روشن و بدون ابهام باشد.", true) }),
                Block("featureGrid", new { eyebrow = "آنچه برای ما مهم است", title = Legacy("about", "values", "سه اصل در معرفی هر محصول"), text = Legacy("about", "values", "", true), items = new[] { new { title = "ریشه در نقش ایرانی", text = "رنگ‌ها و نقش‌های آشنا برای خانه امروز." }, new { title = "توجه به جزئیات", text = "نمایش روشن بافت، دوخت و پشت محصول." }, new { title = "اطلاعات بدون ابهام", text = "مشخصات ساده و قابل مقایسه." } } }),
                Block("cta", new { title = "مسیر ساده خرید در ترما", text = "محصول را ببینید، اندازه مناسب را پیدا کنید و با اطمینان انتخاب کنید.", label = "مشاهده محصولات", href = "/products" })
            ]
        });

        await AddAsync("contact", "ارتباط با ما", true, new CmsDocumentDto
        {
            Seo = new() { Title = "ارتباط با ترما", Description = "راه‌های تماس و پرسش‌های رایج ترما." },
            Blocks =
            [
                Block("hero", new { eyebrow = "ارتباط با ترما", title = Legacy("contact", "intro", "پرسش شما، شروع گفت‌وگوست"), text = Legacy("contact", "intro", "برای راهنمایی انتخاب محصول، پیگیری سفارش یا همکاری با ما پیام بفرستید.", true) }),
                Block("contactInfo", new { title = "راه‌های ارتباط", text = Legacy("contact", "details", "پیش از ارسال پیام، پرسش‌های رایج را هم ببینید.", true), email = "info@terma.ir", phone = "", instagramUrl = "", responseHours = "شنبه تا چهارشنبه، ۹ تا ۱۸" }),
                Block("faq", new { title = "پرسش‌های رایج", items = new[] { new { question = "چطور اندازه مناسب را انتخاب کنم؟", answer = "ابعاد فضای موردنظر را با مشخصات محصول مقایسه کنید." }, new { question = "برای پیگیری سفارش چه اطلاعاتی لازم است؟", answer = "نام خریدار، شماره تماس و شماره سفارش را بنویسید." }, new { question = "رنگ محصول دقیقاً شبیه عکس است؟", answer = "نور محیط و نمایشگر می‌تواند رنگ را کمی متفاوت نشان دهد." } } })
            ]
        });

        await db.SaveChangesAsync(cancellationToken);

        string Legacy(string page, string section, string fallback, bool body = false)
        {
            var value = legacy.FirstOrDefault(x => x.PageKey == page && x.SectionKey == section);
            return value is null ? fallback : body ? value.Body : value.Title;
        }
    }

    private async Task AddAsync(string slug, string name, bool system, CmsDocumentDto document)
    {
        CmsDocumentValidator.Validate(document);
        var page = new CmsPage(slug, name, system);
        var revision = new CmsRevision(page.Id, 1, JsonSerializer.Serialize(document, JsonOptions), "system-migration");
        page.Publish(revision.Id);
        await db.CmsPages.AddAsync(page);
        await db.CmsRevisions.AddAsync(revision);
    }

    private static CmsBlockDto Block(string type, object data) => new()
    {
        Id = Guid.NewGuid().ToString(),
        Type = type,
        Data = JsonSerializer.SerializeToElement(data, JsonOptions)
    };
}
