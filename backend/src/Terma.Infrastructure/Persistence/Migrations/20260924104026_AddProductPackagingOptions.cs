using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Terma.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductPackagingOptions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PackagingFee",
                table: "OrderItems",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "PackagingType",
                table: "OrderItems",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Standard");

            migrationBuilder.CreateTable(
                name: "StoreSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Key = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StoreSettings", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "StoreSettings",
                columns: new[] { "Id", "CreatedAt", "Description", "Key", "UpdatedAt", "Value" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-1111-1111-111111111101"), new DateTime(2026, 9, 24, 10, 40, 25, 593, DateTimeKind.Utc).AddTicks(8823), "هزینه بسته‌بندی کادویی داخل جعبه به تومان", "Packaging:GiftBoxPrice", null, "200000" },
                    { new Guid("11111111-1111-1111-1111-111111111102"), new DateTime(2026, 9, 24, 10, 40, 25, 593, DateTimeKind.Utc).AddTicks(8843), "فعال/غیرفعال بودن انتخاب بسته‌بندی کادویی در فروشگاه", "Packaging:GiftBoxEnabled", null, "true" }
                });

            migrationBuilder.CreateIndex(
                name: "IX_StoreSettings_Key",
                table: "StoreSettings",
                column: "Key",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StoreSettings");

            migrationBuilder.DropColumn(
                name: "PackagingFee",
                table: "OrderItems");

            migrationBuilder.DropColumn(
                name: "PackagingType",
                table: "OrderItems");
        }
    }
}
