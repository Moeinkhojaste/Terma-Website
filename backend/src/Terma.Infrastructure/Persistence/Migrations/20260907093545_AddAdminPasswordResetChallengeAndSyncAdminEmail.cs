using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Terma.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminPasswordResetChallengeAndSyncAdminEmail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AdminPasswordResetChallenges",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AdminEmail = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    CodeHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RequestIpHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    RequestedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FailedAttempts = table.Column<int>(type: "int", nullable: false),
                    ConsumedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    InvalidatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AdminPasswordResetChallenges", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AdminPasswordResetChallenges_AdminEmail_RequestedAtUtc",
                table: "AdminPasswordResetChallenges",
                columns: new[] { "AdminEmail", "RequestedAtUtc" });

            migrationBuilder.CreateIndex(
                name: "IX_AdminPasswordResetChallenges_RequestIpHash_RequestedAtUtc",
                table: "AdminPasswordResetChallenges",
                columns: new[] { "RequestIpHash", "RequestedAtUtc" });

            // Migrate existing admin email from admin@terma.local to admin@termabrand.ir
            migrationBuilder.Sql(@"
IF EXISTS (SELECT 1 FROM [AspNetUsers] WHERE [NormalizedEmail] = 'ADMIN@TERMA.LOCAL' OR [NormalizedUserName] = 'ADMIN@TERMA.LOCAL')
BEGIN
    UPDATE [AspNetUsers]
    SET [UserName] = 'admin@termabrand.ir',
        [NormalizedUserName] = 'ADMIN@TERMABRAND.IR',
        [Email] = 'admin@termabrand.ir',
        [NormalizedEmail] = 'ADMIN@TERMABRAND.IR'
    WHERE [NormalizedEmail] = 'ADMIN@TERMA.LOCAL' OR [NormalizedUserName] = 'ADMIN@TERMA.LOCAL';
END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AdminPasswordResetChallenges");
        }
    }
}
