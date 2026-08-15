using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Terma.Infrastructure.Persistence;

#nullable disable

namespace Terma.Infrastructure.Persistence.Migrations;

[DbContext(typeof(TermaDbContext))]
[Migration("20260809201700_SeedStoreContent")]
public partial class SeedStoreContent : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
INSERT INTO [StoreContents] ([Id],[PageKey],[SectionKey],[Title],[Body],[IsPublished],[CreatedAt]) VALUES
(NEWID(),N'home',N'announcement',N'پیام بالای سایت',N'ارسال سفارش پس از هماهنگی با شما انجام می‌شود.',1,GETUTCDATE()),
(NEWID(),N'home',N'hero',N'ترمه ایرانی برای خانه‌های ماندگار',N'سفره‌های ترمه با نقش ایرانی، دوخت دقیق و انتخابی برای میزهای چهار، شش و هشت نفره.',1,GETUTCDATE()),
(NEWID(),N'about',N'intro',N'درباره ترما',N'ترما مجموعه‌ای از سفره‌های ترمه ایرانی برای خانه‌های گرم و مهمانی‌های ماندگار است.',1,GETUTCDATE()),
(NEWID(),N'contact',N'intro',N'با ما در تماس باشید',N'برای پیگیری سفارش یا راهنمایی انتخاب محصول، پیام خود را برای ما ارسال کنید.',1,GETUTCDATE());");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"DELETE FROM [StoreContents] WHERE [PageKey] IN (N'home',N'about',N'contact');");
    }
}
