using Terma.Application.Admin;

namespace Terma.Application.Common.Interfaces;

public interface IAdminPasswordResetService
{
    Task<AdminPasswordResetResponse> RequestPasswordResetAsync(
        string email,
        string remoteIp,
        CancellationToken cancellationToken = default);

    Task<AdminPasswordResetResult> ConfirmPasswordResetAsync(
        AdminPasswordResetConfirmRequest request,
        string remoteIp,
        CancellationToken cancellationToken = default);
}