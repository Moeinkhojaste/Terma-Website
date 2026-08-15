using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using Terma.Application.Common.Interfaces;

namespace Terma.Infrastructure.Media;

public sealed class ImageOptimizer : IImageOptimizer
{
    public async Task<OptimizedImageResult> OptimizeToWebpAsync(Stream inputStream, int quality = 85, CancellationToken cancellationToken = default)
    {
        if (inputStream.CanSeek && inputStream.Position != 0)
        {
            inputStream.Position = 0;
        }

        using var image = await Image.LoadAsync(inputStream, cancellationToken);
        var encoder = new WebpEncoder
        {
            Quality = Math.Clamp(quality, 1, 100),
            Method = WebpEncodingMethod.Level6,
            FileFormat = WebpFileFormatType.Lossy
        };

        using var memoryStream = new MemoryStream();
        await image.SaveAsWebpAsync(memoryStream, encoder, cancellationToken);

        return new OptimizedImageResult(
            memoryStream.ToArray(),
            image.Width,
            image.Height,
            "image/webp",
            ".webp"
        );
    }
}
