using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Terma.Infrastructure.Persistence;

#nullable disable

namespace Terma.Infrastructure.Persistence.Migrations;

[DbContext(typeof(TermaDbContext))]
[Migration("20260810150000_SeedCompleteStoreContent")]
public partial class SeedCompleteStoreContent : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM StoreContents WHERE PageKey = N'home' AND SectionKey = N'values')
BEGIN
    INSERT INTO StoreContents ([Id],[PageKey],[SectionKey],[Title],[Body],[IsPublished],[CreatedAt]) VALUES
    (NEWID(), N'home', N'values', N'جزئیات روشن، بدون ادعای اضافه', N'رویه ترمه با نقوش ایرانی، دوخت منظم و آستر ساتن هم‌رنگ برای زیبایی و دوام ماندگار.', 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT 1 FROM StoreContents WHERE PageKey = N'home' AND SectionKey = N'craft')
BEGIN
    INSERT INTO StoreContents ([Id],[PageKey],[SectionKey],[Title],[Body],[IsPublished],[CreatedAt]) VALUES
    (NEWID(), N'home', N'craft', N'بافت، لبه و آستر؛ سه جزئی که دیده می‌شوند', N'رنگ اصلی زمینه در کنار نقش‌های بته‌جقه و نوار باریک دور کار، مرز تمیزی میان رویه ترمه و آستر ساتن می‌سازد.', 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT 1 FROM StoreContents WHERE PageKey = N'home' AND SectionKey = N'guide')
BEGIN
    INSERT INTO StoreContents ([Id],[PageKey],[SectionKey],[Title],[Body],[IsPublished],[CreatedAt]) VALUES
    (NEWID(), N'home', N'guide', N'راهنمای خرید و ابعاد درست', N'طول و عرض فضایی را که می‌خواهید سفره را روی آن پهن کنید اندازه بگیرید. ابعاد سفره باید با فضای مورد نظر هماهنگ باشد.', 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT 1 FROM StoreContents WHERE PageKey = N'about' AND SectionKey = N'story')
BEGIN
    INSERT INTO StoreContents ([Id],[PageKey],[SectionKey],[Title],[Body],[IsPublished],[CreatedAt]) VALUES
    (NEWID(), N'about', N'story', N'داستان برند ترما', N'ترما با هدف احیای زیبایی ترمه اصیل ایرانی در چیدمان خانه‌های امروزی شکل گرفت. تمرکز ما بر اصالت نقش، کیفیت پارچه و دوخت تمیز است.', 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT 1 FROM StoreContents WHERE PageKey = N'about' AND SectionKey = N'values')
BEGIN
    INSERT INTO StoreContents ([Id],[PageKey],[SectionKey],[Title],[Body],[IsPublished],[CreatedAt]) VALUES
    (NEWID(), N'about', N'values', N'ارزش‌ها و تعهد ما', N'تضمین اصالت پارچه ترمه، دوخت آستر ساتن باکیفیت و پاسخگویی شفاف به مشتریان از اصول همیشگی ترما است.', 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT 1 FROM StoreContents WHERE PageKey = N'contact' AND SectionKey = N'details')
BEGIN
    INSERT INTO StoreContents ([Id],[PageKey],[SectionKey],[Title],[Body],[IsPublished],[CreatedAt]) VALUES
    (NEWID(), N'contact', N'details', N'اطلاعات تماس و پشتیبانی', N'تلفن پشتیبانی: ۰۲۱-۸۸۸۸۸۸۸۸ | ایمیل: info@terma.ir | ساعت پاسخگویی: شنبه تا چهارشنبه ۹ تا ۱۸', 1, GETUTCDATE());
END

IF NOT EXISTS (SELECT 1 FROM StoreContents WHERE PageKey = N'common' AND SectionKey = N'footer_tagline')
BEGIN
    INSERT INTO StoreContents ([Id],[PageKey],[SectionKey],[Title],[Body],[IsPublished],[CreatedAt]) VALUES
    (NEWID(), N'common', N'footer_tagline', N'ترما | سفره‌های ترمه ایرانی', N'ترما عرضه‌کننده سفره‌های ترمه اصیل ایرانی با آستر ساتن و دوخت سفارشی برای خانه‌های ماندگار.', 1, GETUTCDATE());
END");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}
