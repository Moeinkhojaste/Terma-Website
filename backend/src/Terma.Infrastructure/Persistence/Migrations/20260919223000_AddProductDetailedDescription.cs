using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Terma.Infrastructure.Persistence;

#nullable disable

namespace Terma.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    [DbContext(typeof(TermaDbContext))]
    [Migration("20260919223000_ReAddProductDetailedDescription")]
    public partial class ReAddProductDetailedDescription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'DetailedDescription')
BEGIN
    ALTER TABLE [Products] ADD [DetailedDescription] nvarchar(4000) NULL;
END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
IF EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[Products]') AND name = 'DetailedDescription')
BEGIN
    ALTER TABLE [Products] DROP COLUMN [DetailedDescription];
END");
        }
    }
}
