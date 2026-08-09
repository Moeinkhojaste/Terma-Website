using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Terma.Infrastructure.Persistence;

#nullable disable

namespace Terma.Infrastructure.Persistence.Migrations;

[DbContext(typeof(TermaDbContext))]
[Migration("20260809201500_SeedDefaultProductVariants")]
public partial class SeedDefaultProductVariants : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
INSERT INTO [ProductVariants] ([Id], [ProductId], [Title], [Sku], [Color], [TableCapacity], [Length], [Width], [Price], [CompareAtPrice], [StockQuantity], [ReservedQuantity], [LowStockThreshold], [IsActive], [CreatedAt])
SELECT NEWID(), p.[Id], N'تنوع پیش‌فرض', p.[Sku], p.[Color], p.[TableCapacity], p.[Length], p.[Width], p.[Price], NULL, p.[StockQuantity], 0, 2, p.[IsActive], p.[CreatedAt]
FROM [Products] p
WHERE NOT EXISTS (SELECT 1 FROM [ProductVariants] v WHERE v.[ProductId] = p.[Id]);");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"DELETE v FROM [ProductVariants] v WHERE v.[Title] = N'تنوع پیش‌فرض';");
    }
}
