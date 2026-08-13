using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Terma.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProductMediaKind : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Kind",
                table: "ProductMedia",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Other");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Kind",
                table: "ProductMedia");
        }
    }
}
