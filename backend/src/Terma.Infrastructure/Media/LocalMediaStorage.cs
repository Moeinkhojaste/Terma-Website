using Microsoft.Extensions.Configuration;
using Terma.Application.Common.Interfaces;

namespace Terma.Infrastructure.Media;

public sealed class LocalMediaStorage(IConfiguration configuration) : IMediaStorage
{
    private string Root => Path.GetFullPath(configuration["MediaStorage:RootPath"] ?? Path.Combine(AppContext.BaseDirectory, "media"));

    public async Task<StoredMedia> SaveAsync(Stream content, string contentType, string extension, CancellationToken cancellationToken)
    {
        Directory.CreateDirectory(Root);
        var key = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var path = Resolve(key);
        await using var output = File.Create(path);
        await content.CopyToAsync(output, cancellationToken);
        return new(key, $"/api/media/{key}", contentType, output.Length);
    }

    public Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken)
    {
        var path = Resolve(key);
        if (!File.Exists(path)) return Task.FromResult<Stream?>(null);
        return Task.FromResult<Stream?>(File.OpenRead(path));
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    { var path = Resolve(key); if (File.Exists(path)) File.Delete(path); return Task.CompletedTask; }

    private string Resolve(string key)
    {
        var root = Path.TrimEndingDirectorySeparator(Root);
        var path = Path.GetFullPath(Path.Combine(root, key));
        var rootPrefix = root + Path.DirectorySeparatorChar;
        if (!path.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)) throw new InvalidOperationException("Invalid media key.");
        return path;
    }
}
