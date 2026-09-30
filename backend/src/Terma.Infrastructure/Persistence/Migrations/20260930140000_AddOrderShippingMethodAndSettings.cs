using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Terma.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrderShippingMethodAndSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
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
