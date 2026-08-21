using SixLabors.ImageSharp;

namespace Terma.Infrastructure.Media;

public static class ImageSanitizer
{
    public const long MaxFileSize = 10 * 1024 * 1024; // 10 MB
    public const long MaxPixelCount = 25_000_000; // 25 Megapixels

    public static (bool IsValid, string? Error, int Width, int Height, string ContentType) ValidateAndInspect(byte[] buffer, string extension)
    {
        if (buffer.Length == 0 || buffer.Length > MaxFileSize)
            return (false, "File size must be between 1 byte and 10 MB.", 0, 0, string.Empty);

        var ext = extension.ToLowerInvariant();
        if (ext is not (".jpg" or ".jpeg" or ".png" or ".webp"))
        {
            return (false, "Only JPEG, PNG and WebP images are allowed.", 0, 0, string.Empty);
        }

        try
        {
            var info = Image.Identify(buffer);
            if (info is null)
            {
                return (false, "The file is not a valid image or is corrupted.", 0, 0, string.Empty);
            }

            var mimeType = info.Metadata.DecodedImageFormat?.DefaultMimeType?.ToLowerInvariant() ?? string.Empty;
            var isAllowedFormat = mimeType is "image/jpeg" or "image/jpg" or "image/png" or "image/webp";
            if (!isAllowedFormat)
            {
                return (false, $"Image format '{mimeType}' is not allowed. Only JPEG, PNG and WebP are supported.", 0, 0, string.Empty);
            }

            var width = info.Width;
            var height = info.Height;

            if (width <= 0 || height <= 0)
            {
                return (false, "Invalid image dimensions.", 0, 0, string.Empty);
            }

            if ((long)width * height > MaxPixelCount)
            {
                return (false, $"Image resolution exceeds maximum allowed 25 megapixels ({width}x{height}).", width, height, string.Empty);
            }

            return (true, null, width, height, mimeType);
        }
        catch
        {
            return (false, "Failed to read image metadata. The file may be corrupted.", 0, 0, string.Empty);
        }
    }
}
