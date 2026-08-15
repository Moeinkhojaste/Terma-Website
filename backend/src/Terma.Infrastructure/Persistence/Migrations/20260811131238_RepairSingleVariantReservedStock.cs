using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Terma.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RepairSingleVariantReservedStock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                UPDATE variant
                SET variant.StockQuantity = product.StockQuantity + variant.ReservedQuantity
                FROM ProductVariants AS variant
                INNER JOIN Products AS product ON product.Id = variant.ProductId
                WHERE (
                    SELECT COUNT(*)
                    FROM ProductVariants AS sibling
                    WHERE sibling.ProductId = variant.ProductId
                ) = 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // This data repair cannot be safely reversed because the previous
            // physical stock value was already corrupted by double deduction.
        }
    }
}
