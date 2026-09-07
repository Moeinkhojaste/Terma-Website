using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Terma.Infrastructure.Persistence;

#nullable disable

namespace Terma.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(TermaDbContext))]
    [Migration("20260810140000_AddProductDiscount")]
    public partial class AddProductDiscount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'CompareAtPrice')
BEGIN
    ALTER TABLE [Products] ADD [CompareAtPrice] decimal(18,2) NULL;
END
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'DiscountPercent')
BEGIN
    ALTER TABLE [Products] ADD [DiscountPercent] int NULL;
END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'CompareAtPrice')
BEGIN
    ALTER TABLE [Products] DROP COLUMN [CompareAtPrice];
END
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'DiscountPercent')
BEGIN
    ALTER TABLE [Products] DROP COLUMN [DiscountPercent];
END");
        }
    }
}
