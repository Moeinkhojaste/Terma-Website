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
        var existingSlugs = await db.CmsPages.AsNoTracking().Select(x => x.Slug).ToListAsync(cancellationToken);
        var existingSet = new HashSet<string>(existingSlugs, StringComparer.OrdinalIgnoreCase);

        var legacy = await db.StoreContents.AsNoTracking().ToListAsync(cancellationToken);

        if (!existingSet.Contains("site-settings"))
        {
            await AddAsync("site-settings", "تنظیمات عمومی سایت", true, new CmsDocumentDto
            {
                Seo = new() { Title = "ترما | سفره‌های ترمه ایرانی", Description = "سفره‌های ترمه با نقش ایرانی، دوخت دقیق و آستر ساتن." },
                Blocks =
                [
                    Block("announcement", new { text = Legacy("home", "announcement", "نقش ایرانی، دوخت دقیق، برای خانه امروز", body: true) }),
                    Block("linkList", new { title = "منوی اصلی", placement = "header", items = new[] { new { label = "محصولات", href = "/products" }, new { label = "درباره ما", href = "/about" }, new { label = "ارتباط با ما", href = "/contact" } } }),
                    Block("contactInfo", new { brandName = "ترما", tagline = Legacy("common", "footer_tagline", "سفره‌های ترمه برای خانه‌های ایرانی امروز", body: true), email = "info@terma.ir", phone = "۰۲۱-۸۸۸۸۸۸۸۸", instagramUrl = "https://instagram.com/terma_ir", telegramUrl = "https://t.me/terma_ir", whatsappUrl = "https://wa.me/989121234567", responseHours = "شنبه تا چهارشنبه، ۹ تا ۱۸", logoUrl = "/images/terma-logo.webp" }),
                    Block("linkList", new { title = "لینک‌های فوتر", placement = "footer", items = new[] { new { label = "درباره ما", href = "/about" }, new { label = "ارتباط با ما", href = "/contact" }, new { label = "شرایط استفاده", href = "/terms" }, new { label = "حریم خصوصی", href = "/privacy" } } })
                ]
            });
        }

        if (!existingSet.Contains("home"))
        {
            await AddAsync("home", "صفحه اصلی", true, new CmsDocumentDto
            {
                Seo = new() { Title = "ترما | سفره‌های ترمه ایرانی", Description = "سفره‌های ترمه با نقش ایرانی، دوخت دقیق و آستر ساتن در ظرفیت‌های چهار، شش و هشت نفره." },
                Blocks =
                [
                    Block("hero", new { eyebrow = "ترمه، برای خانه امروز", title = Legacy("home", "hero", "نقش ایرانی، در خانه شما"), text = Legacy("home", "hero", "سفره‌های ترمه با آستر ساتن و لبه‌دوزی دقیق؛ برای پهن‌کردن روی میز یا روی زمین.", true), imageUrl = "/images/firoozeh-folded.webp", imageAlt = "سفره ترمه فیروزه", images = new[] { new { url = "/images/firoozeh-folded.webp", alt = "سفره ترمه فیروزه با نقش‌های آبی، کرم و مسی" }, new { url = "/images/lajvard-folded.webp", alt = "سفره ترمه لاجورد با نقش‌های سفید و مسی" }, new { url = "/images/nila-folded.webp", alt = "سفره ترمه نیلا با نقش‌های بته‌جقه آبی" } }, primaryLabel = "دیدن محصولات", primaryHref = "/products", secondaryLabel = "راهنمای انتخاب", secondaryHref = "/#راهنمای-خرید" }),
                    Block("categoryLinks", new { eyebrow = "دسته‌بندی", title = "انتخاب بر اساس ظرفیت", items = new[] { new { label = "۴ نفره", href = "/products?tableCapacity=4" }, new { label = "۶ نفره", href = "/products?tableCapacity=6" }, new { label = "۸ نفره", href = "/products?tableCapacity=8" } } }),
                    Block("productShowcase", new { eyebrow = "مجموعه ترما", title = "منتخب‌های ترما", text = "سه محصول از مجموعه فعلی را ببینید.", count = 3 }),
                    Block("featureGrid", new { eyebrow = "آنچه در محصول می‌بینید", title = Legacy("home", "values", "جزئیات روشن، بدون ادعای اضافه"), text = Legacy("home", "values", "", true), items = new[] { new { title = "نقش ایرانی", text = "بته‌جقه و نقوش ریز سنتی، با ترکیب رنگ مناسب خانه‌های امروزی." }, new { title = "دوخت منظم", text = "لبه‌دوزی یکپارچه و نوار کرم‌طلایی در چهار طرف سفره." }, new { title = "آستر ساتن", text = "پشت هر سفره با ساتن هم‌رنگ آستر شده است." } } }),
                    Block("imageText", new { eyebrow = "نمای واقعی محصول", title = Legacy("home", "craft", "نمای تاشده و نقش‌های قابل‌مشاهده"), text = Legacy("home", "craft", "این عکس واقعی، محصول را در حالت تاشده نشان می‌دهد. نمای روی میز در گالری محصول موجود است.", true), imageUrl = "/images/nila-folded.webp", imageAlt = "سفره ترمه نیلا به‌صورت تاشده", imageSide = "right" }),
                    Block("featureGrid", new { eyebrow = "پیش از انتخاب", title = Legacy("home", "guide", "اندازه درست را پیدا کنید"), text = Legacy("home", "guide", "فضای استفاده را اندازه بگیرید و با ابعاد محصول مقایسه کنید.", true), anchor = "راهنمای-خرید", items = new[] { new { title = "فضا را اندازه بگیرید", text = "طول و عرض فضای موردنظر را یادداشت کنید." }, new { title = "ابعاد را مقایسه کنید", text = "اندازه محصول را با فضای خود مقایسه کنید." }, new { title = "ظرفیت را انتخاب کنید", text = "از میان ظرفیت‌های ۴، ۶ و ۸ نفره انتخاب کنید." } } })
                ]
            });
        }

        if (!existingSet.Contains("about"))
        {
            await AddAsync("about", "درباره ما", true, new CmsDocumentDto
            {
                Seo = new() { Title = "درباره ترما", Description = "داستان و ارزش‌های فروشگاه ترما." },
                Blocks =
                [
                    Block("hero", new { eyebrow = "درباره ترما", title = Legacy("about", "intro", "نقش‌های آشنا، برای زندگی امروز"), text = Legacy("about", "intro", "ترما فروشگاهی برای انتخاب روشن و ساده سفره‌های ترمه است.", true), imageUrl = "/images/lajvard-table.webp", imageAlt = "سفره ترمه لاجورد روی میز", primaryLabel = "دیدن محصولات", primaryHref = "/products" }),
                    Block("richText", new { eyebrow = "داستان ما", title = Legacy("about", "story", "میان اصالت و سادگی"), text = Legacy("about", "story", "تجربه خرید ترمه باید ساده، روشن و بدون ابهام باشد.", true) }),
                    Block("featureGrid", new { eyebrow = "آنچه برای ما مهم است", title = Legacy("about", "values", "سه اصل در معرفی هر محصول"), text = Legacy("about", "values", "", true), items = new[] { new { title = "ریشه در نقش ایرانی", text = "رنگ‌ها و نقش‌های آشنا برای خانه امروز." }, new { title = "تصاویر واقعی", text = "نمایش فقط عکس‌های موجود و مشخص‌کردن نماهای عکاسی‌نشده." }, new { title = "اطلاعات بدون ابهام", text = "مشخصات ساده و قابل مقایسه." } } }),
                    Block("cta", new { title = "مسیر ساده خرید در ترما", text = "محصول را ببینید، اندازه مناسب را پیدا کنید و با اطمینان انتخاب کنید.", label = "مشاهده محصولات", href = "/products" })
                ]
            });
        }

        if (!existingSet.Contains("contact"))
        {
            await AddAsync("contact", "ارتباط با ما", true, new CmsDocumentDto
            {
                Seo = new() { Title = "ارتباط با ترما", Description = "راه‌های تماس و پرسش‌های رایج ترما." },
                Blocks =
                [
                    Block("hero", new { eyebrow = "ارتباط با ترما", title = Legacy("contact", "intro", "پرسش شما، شروع گفت‌وگوست"), text = Legacy("contact", "intro", "برای راهنمایی انتخاب محصول، پیگیری سفارش یا همکاری با ما پیام بفرستید.", true) }),
                    Block("contactInfo", new { title = "راه‌های ارتباط", text = "برای راهنمایی انتخاب محصول، پیگیری سفارش، پیشنهاد همکاری یا هر پرسش دیگر، با ما در ارتباط باشید.", email = "info@terma.ir", phone = "۰۲۱-۸۸۸۸۸۸۸۸", instagramUrl = "https://instagram.com/terma_ir", telegramUrl = "https://t.me/terma_ir", whatsappUrl = "https://wa.me/989121234567", responseHours = "شنبه تا چهارشنبه، ۹ تا ۱۸" }),
                    Block("faq", new { title = "پرسش‌های رایج", items = new[] { new { question = "چطور اندازه مناسب را انتخاب کنم؟", answer = "ابعاد فضای موردنظر را با مشخصات محصول مقایسه کنید." }, new { question = "برای پیگیری سفارش چه اطلاعاتی لازم است؟", answer = "نام خریدار، شماره تماس و شماره سفارش را بنویسید." }, new { question = "رنگ محصول دقیقاً شبیه عکس است؟", answer = "نور محیط و نمایشگر می‌تواند رنگ را کمی متفاوت نشان دهد." } } })
                ]
            });
        }

        if (!existingSet.Contains("privacy"))
        {
            await AddAsync("privacy", "حریم خصوصی", true, new CmsDocumentDto
            {
                Seo = new() { Title = "حریم خصوصی | فروشگاه اینترنتی ترما", Description = "سیاست‌های حفظ حریم خصوصی، امنیت داده‌ها و نحوه نگهداری از اطلاعات کاربران در فروشگاه ترما." },
                Blocks =
                [
                    Block("hero", new { eyebrow = "امنیت و شفافیت داده‌ها", title = "حریم خصوصی و حفاظت از اطلاعات کاربران ترما", text = "در ترما، حفظ امنیت اطلاعات هویتی و احترام به حریم شخصی کاربران اولویت اساسی ماست. تمامی داده‌های ثبت‌شده صرفاً برای پردازش دقیق سفارش‌ها استفاده می‌شوند." }),
                    Block("featureGrid", new { eyebrow = "اصول امنیت و محرمانگی", title = "اصول چهارگانه حفاظت از داده‌ها در ترما", text = "چارچوب‌های کلیدی ما برای نگهداری امن از اطلاعات شما.", items = new[]
                    {
                        new { title = "دریافت حداقل اطلاعات ضروری", text = "تنها اطلاعات لازم برای ورود پیامکی و ارسال پستی سفارش (شماره موبایل، نام و آدرس) دریافت می‌شود." },
                        new { title = "عدم اشتراک با اشخاص ثالث", text = "اطلاعات شخصی شما هرگز به شرکت‌های تبلیغاتی یا اشخاص ثالث فروخته یا واگذار نخواهد شد." },
                        new { title = "امنیت تراکنش بانکی شاپرک", text = "کلیه پرداخت‌ها روی درگاه‌های رسمی شاپرک انجام شده و هیچ‌گونه داده پرداختی در ترما ذخیره نمی‌شود." },
                        new { title = "دسترسی و مدیریت کامل اطلاعات", text = "شما در هر زمان می‌توانید از طریق حساب کاربری، نشانی‌ها و اطلاعات شخصی خود را ویرایش یا به‌روزرسانی کنید." }
                    } }),
                    Block("richText", new { eyebrow = "نحوه استفاده از داده‌ها", title = "چه اطلاعاتی دریافت شده و چگونه استفاده می‌شود؟", text = "هنگام ثبت‌نام یا ورود به ترما، احراز هویت از طریق کد یکبارمصرف پیامکی (OTP) انجام می‌شود تا نیازی به ذخیره رمزهای عبور آسیب‌پذیر نباشد. برای ثبت سفارش، اطلاعات نشانی پستی و کدپستی صرفاً در اختیار مأمورین رسمی پست و ارسال کالا قرار می‌گیرد. همچنین تاریخچه سفارش‌ها در پروفایل کاربری شما جهت سهولت در پیگیری، مشاهده فاکتورها و دریافت خدمات پس از فروش نگهداری می‌شود." }),
                    Block("richText", new { eyebrow = "کوکی‌ها و امنیت فنی", title = "کوکی‌ها، نشست‌ها و رمزنگاری ارتباطات", text = "وب‌سایت ترما از کوکی‌های فنی صرفاً برای نگهداری نشست کاربری امن و حفظ اقلام سبد خرید استفاده می‌کند. کلیه درخواست‌ها و تبادل داده میان مرورگر کاربر و سرور ترما از طریق پروتکل‌های رمزنگاری‌شده HTTPS انجام می‌شود و سرورها به صورت مستمر تحت نظارت‌های امنیتی و ضدتقلب قرار دارند." }),
                    Block("faq", new { title = "پرسش‌های متداول درباره حریم خصوصی", items = new[]
                    {
                        new { question = "آیا اطلاعات کارت بانکی من در سایت ترما ذخیره می‌شود؟", answer = "خیر؛ فرآیند پرداخت به طور مستقیم در درگاه‌های پرداخت متصل به شبکه شاپرک بانک مرکزی انجام می‌شود و ترما هیچ‌گونه دسترسی به شماره کارت، رمز دوم یا CVV2 ندارد." },
                        new { question = "اطلاعات نشانی و تماس من در اختیار چه کسانی قرار می‌گیرد؟", answer = "تنها اطلاعات ضروری ارسال شامل نام، تلفن و نشانی به شرکت پست یا پیک طرف قرارداد تحویل داده می‌شود تا سفارش به دست شما برسد." },
                        new { question = "چطور می‌توانم اطلاعات حساب کاربری‌ام را تغییر دهم؟", answer = "کافی است وارد حساب کاربری خود شده و از بخش پروفایل یا آدرس‌ها اطلاعات خود را ویرایش فرمایید." }
                    } }),
                    Block("contactInfo", new { title = "پاسخگویی به مسائل حریم خصوصی", text = "در صورت وجود هرگونه سؤال، ابهام یا درخواست در خصوص داده‌های کاربری، با پشتیبانی ترما در ارتباط باشید.", email = "privacy@terma.ir", phone = "", instagramUrl = "", responseHours = "شنبه تا چهارشنبه، ۹ تا ۱۸" })
                ]
            });
        }

        if (!existingSet.Contains("terms"))
        {
            await AddAsync("terms", "شرایط استفاده", true, new CmsDocumentDto
            {
                Seo = new() { Title = "شرایط و قوانین استفاده | فروشگاه اینترنتی ترما", Description = "قوانین و مقررات خرید، ارسال، پرداخت، ضمانت بازگشت کالا و شرایط استفاده از خدمات فروشگاه ترما." },
                Blocks =
                [
                    Block("hero", new { eyebrow = "قوانین و مقررات", title = "شرایط و ضوابط استفاده از فروشگاه ترما", text = "استفاده از خدمات ترما و ثبت سفارش به معنی پذیرش آگاهانه قوانین تجارت الکترونیک و ضوابط این صفحه است. هدف ما تجربه‌ای شفاف، بدون ابهام و رضایت‌بخش برای خریداران گرامی است.", primaryLabel = "مشاهده محصولات", primaryHref = "/products", secondaryLabel = "راهنمای خرید", secondaryHref = "/#راهنمای-خرید" }),
                    Block("featureGrid", new { eyebrow = "تعهدات و ضمانت‌ها", title = "ارکان اصلی ضوابط خرید در ترما", text = "حقوق خریدار و تعهدات فروشگاه در تمام مراحل خرید.", items = new[]
                    {
                        new { title = "ضمانت اصالت و مشخصات دقیق", text = "کلیه اطلاعات مربوط به ابعاد، نوع پارچه، رنگ و دوخت محصولات با مشخصات واقعی مطابقت کامل دارند." },
                        new { title = "ضمانت ۷ روزه بازگشت کالا", text = "مطابق قانون تجارت الکترونیک، امکان مرجوعی کالا تا ۷ روز پس از تحویل در صورت حفظ بسته‌بندی و عدم استفاده وجود دارد." },
                        new { title = "ارسال سریع و بسته‌بندی ایمن", text = "سفارش‌ها با بسته‌بندی محافظتی استاندارد آماده و از طریق پست پیشتاز با کد رهگیری ارسال می‌شوند." },
                        new { title = "قیمت‌گذاری شفاف و نهایی", text = "قیمت‌های درج‌شده به تومان نهایی بوده و هیچ هزینه پنهان یا اضافه‌ای به سفارش افزوده نخواهد شد." }
                    } }),
                    Block("richText", new { eyebrow = "ثبت و ارسال سفارش", title = "فرآیند ثبت، پرداخت و ارسال کالا", text = "خریداران گرامی موظفند هنگام ثبت سفارش، اطلاعات تماس و نشانی گیرنده را با دقت وارد نمایند. پس از تکمیل پرداخت در درگاه بانکی، شناسه پیگیری و پیامک تایید سفارش صادر می‌شود. سفارش‌ها طی ۱ الی ۲ روز کاری بسته‌بندی و به اداره پست تحویل داده می‌شوند و کد رهگیری پستی به شماره همراه خریدار پیامک خواهد شد." }),
                    Block("richText", new { eyebrow = "شرایط مرجوعی و انصراف", title = "رویه بازگشت کالا و استرداد وجه", text = "در صورت وجود هرگونه ایراد در دوخت، لکه، پارگی یا مغایرت با سفارش ثبت‌شده، خریدار می‌تواند ظرف ۴۸ ساعت پس از تحویل کالا به پشتیبانی اطلاع دهد. در این حالت کلیه هزینه‌های بازگشت و تعویض بر عهده ترما است. در صورت انصراف از خرید تا ۷ روز، کالا باید کاملاً نو و در بسته‌بندی اصلی بازگردانده شود و وجه سفارش پس از تحویل و بررسی به حساب خریدار واریز می‌گردد." }),
                    Block("richText", new { eyebrow = "مالکیت معنوی", title = "حقوق مالکیت مادی و معنوی", text = "تمامی محتوا، عکس‌های اختصاصی، نشان تجاری و طرح‌های ارائه‌شده در وب‌سایت ترما تحت پوشش قوانین مالکیت معنوی قرار داشته و هرگونه استفاده تجاری از آن‌ها بدون مجوز کتبی پیگرد قانونی دارد." }),
                    Block("faq", new { title = "پرسش‌های متداول شرایط و قوانین", items = new[]
                    {
                        new { question = "آیا می‌توانم پیش از ارسال، سفارش خود را لغو کنم؟`", answer = "بله؛ تا قبل از تحویل بسته به پست می‌توانید از طریق تماس با پشتیبانی درخواست لغو سفارش و بازگشت کامل وجه را ثبت کنید." },
                        new { question = "اگر محصول دریافت شده با عکس سایت تفاوت داشته باشد چه می‌شود؟", answer = "در صورت هرگونه مغایرت در رنگ، طرح یا اندازه، ترما مسئولیت کامل را پذیرفته و محصول را بدون هزینه برای شما تعویض یا مرجوع می‌نماید." },
                        new { question = "هزینه ارسال مجدد یا بازگشت کالا چگونه محاسبه می‌شود؟", answer = "در صورت بروز نقص در محصول یا خطای فروشگاه، تمام هزینه‌ها با ترما است. در انصراف سلیقه‌ای، هزینه پست بازگشت با خریدار می‌باشد." }
                    } }),
                    Block("cta", new { title = "سفره‌های ترمه ایرانی برای خانه شما", text = "مجموعه منتخب سفره‌های ترمه با نقش اصیل و دوخت منظم را بررسی کنید.", label = "مشاهده محصولات", href = "/products" })
                ]
            });
        }

        if (!existingSet.Contains("products"))
        {
            await AddAsync("products", "صفحه محصولات", true, new CmsDocumentDto
            {
                Seo = new()
                {
                    Title = "خرید سفره طرح ترمه سنتی (۴، ۶ و ۸ نفره)",
                    Description = "مشاهده و خرید انواع سفره‌های غذاخوری و پذیرایی طرح ترمه با دوخت دقیق و آستر ساتن در ظرفیت‌های ۴، ۶ و ۸ نفره در فروشگاه ترما."
                },
                Blocks =
                [
                    Block("faq", new
                    {
                        eyebrow = "پاسخ به سوالات شما",
                        title = "پرسش‌های متداول خرید سفره طرح ترمه",
                        items = new[]
                        {
                            new
                            {
                                question = "ابعاد سفره‌های ۴، ۶ و ۸ نفره ترما چقدر است؟",
                                answer = "سفره ۴ نفره در اندازه ۱۰۰×۱۰۰ سانتی‌متر (مربع)، سفره ۶ نفره در اندازه ۱۶۰×۱۱۰ سانتی‌متر (مستطیل) و سفره ۸ نفره در اندازه ۲۴۰×۱۱۰ سانتی‌متر (مستطیل بزرگ) با آستر ساتن هم‌رنگ و لبه‌دوزی منظم دوخته می‌شوند."
                            },
                            new
                            {
                                question = "جنس پارچه و آستر سفره‌های طرح ترمه چگونه است؟",
                                answer = "رویه این سفره‌ها از پارچه متراکم با نقوش اصیل طرح ترمه تهیه شده و پشت هر سفره با پارچه ساتن ضخیم آسترکشی شده است تا ایستایی منظمی روی میز داشته باشد و از لغزش جلوگیری کند."
                            },
                            new
                            {
                                question = "بهترین روش شست‌وشو و اتوکشی این سفره‌ها چیست؟",
                                answer = "توصیه می‌شود سفره را با آب ولرم یا سرد و مایع لباسشویی ملایم به‌صورت دستی یا دور ملایم ماشین لباسشویی بشویید. برای حفظ زیبایی طرح، اتوکشی را با درجه ملایم از سمت آستر ساتن انجام دهید."
                            },
                            new
                            {
                                question = "چگونه سفره مناسب ابعاد میز خود را انتخاب کنم؟",
                                answer = "طول و عرض سطح میز خود را اندازه بگیرید. برای جلوه زیباتر، پیشنهاد می‌شود سفره بین ۱۵ تا ۲۵ سانتی‌متر از لبه‌های میز آویزان شود. مدل‌های ۴، ۶ و ۸ نفره متناسب با اندازه‌های استاندارد میزهای ناهارخوری تولید شده‌اند."
                            }
                        }
                    })
                ]
            });
        }

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

