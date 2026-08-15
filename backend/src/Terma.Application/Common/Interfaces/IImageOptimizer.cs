namespace Terma.Application.Common.Interfaces;

public record OptimizedImageResult(
    byte[] Data,
    int Width,
    int Height,
    string ContentType,
    string Extension
);

public interface IImageOptimizer
{
    Task<OptimizedImageResult> OptimizeToWebpAsync(Stream inputStream, int quality = 85, CancellationToken cancellationToken = default);
}
