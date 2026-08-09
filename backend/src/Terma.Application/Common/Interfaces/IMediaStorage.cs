namespace Terma.Application.Common.Interfaces;

public sealed record StoredMedia(string Key, string PublicUrl, string ContentType, long Length);

public interface IMediaStorage
{
    Task<StoredMedia> SaveAsync(Stream content, string contentType, string extension, CancellationToken cancellationToken);
    Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken);
    Task DeleteAsync(string key, CancellationToken cancellationToken);
}
