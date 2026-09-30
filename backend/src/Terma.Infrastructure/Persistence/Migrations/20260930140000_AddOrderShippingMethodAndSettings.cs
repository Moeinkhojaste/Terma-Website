using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Terma.Infrastructure.Persistence;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Terma.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(TermaDbContext))]
    [Migration("20260930140000_AddOrderShippingMethodAndSettings")]
    public partial class AddOrderShippingMethodAndSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (migrationBuilder.ActiveProvider == "Microsoft.EntityFrameworkCore.SqlServer")
            {
                migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Orders]') AND name = 'ShippingMethod')
BEGIN
    ALTER TABLE [Orders] ADD [ShippingMethod] nvarchar(40) NOT NULL CONSTRAINT [DF_Orders_ShippingMethod] DEFAULT 'Pishtaz';
END");

                migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT 1 FROM [StoreSettings] WHERE [Key] = 'Shipping:PishtazPrice')
    INSERT INTO [StoreSettings] ([Id], [CreatedAt], [Description], [Key], [Value])
    VALUES ('22222222-2222-2222-2222-222222222201', GETUTCDATE(), N'هزینه ارسال با پست پیشتاز به تومان', 'Shipping:PishtazPrice', '140000');
IF NOT EXISTS (SELECT 1 FROM [StoreSettings] WHERE [Key] = 'Shipping:PishtazEnabled')
    INSERT INTO [StoreSettings] ([Id], [CreatedAt], [Description], [Key], [Value])
    VALUES ('22222222-2222-2222-2222-222222222202', GETUTCDATE(), N'فعال‌بودن ارسال با پست پیشتاز در فروشگاه', 'Shipping:PishtazEnabled', 'true');
IF NOT EXISTS (SELECT 1 FROM [StoreSettings] WHERE [Key] = 'Shipping:TipaxEnabled')
    INSERT INTO [StoreSettings] ([Id], [CreatedAt], [Description], [Key], [Value])
    VALUES ('22222222-2222-2222-2222-222222222203', GETUTCDATE(), N'فعال‌بودن ارسال با تیپاکس (پس‌کرایه) در فروشگاه', 'Shipping:TipaxEnabled', 'true');");
            }
            else
            {
                migrationBuilder.AddColumn<string>(
                    name: "ShippingMethod",
                    table: "Orders",
                    type: "nvarchar(40)",
                    maxLength: 40,
                    nullable: false,
                    defaultValue: "Pishtaz");

                migrationBuilder.InsertData(
                    table: "StoreSettings",
                    columns: new[] { "Id", "CreatedAt", "Description", "Key", "UpdatedAt", "Value" },
                    values: new object[,]
                    {
                        { new Guid("22222222-2222-2222-2222-222222222201"), new DateTime(2026, 9, 30, 14, 0, 0, DateTimeKind.Utc), "هزینه ارسال با پست پیشتاز به تومان", "Shipping:PishtazPrice", null, "140000" },
                        { new Guid("22222222-2222-2222-2222-222222222202"), new DateTime(2026, 9, 30, 14, 0, 0, DateTimeKind.Utc), "فعال‌بودن ارسال با پست پیشتاز در فروشگاه", "Shipping:PishtazEnabled", null, "true" },
                        { new Guid("22222222-2222-2222-2222-222222222203"), new DateTime(2026, 9, 30, 14, 0, 0, DateTimeKind.Utc), "فعال‌بودن ارسال با تیپاکس (پس‌کرایه) در فروشگاه", "Shipping:TipaxEnabled", null, "true" }
                    });
            }
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "StoreSettings",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222201"));

            migrationBuilder.DeleteData(
                table: "StoreSettings",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222202"));

            migrationBuilder.DeleteData(
                table: "StoreSettings",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222203"));

            migrationBuilder.DropColumn(
                name: "ShippingMethod",
                table: "Orders");
        }
    }
}
