using System.Buffers.Binary;

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
        return ext switch
        {
            ".jpg" or ".jpeg" => ValidateJpeg(buffer),
            ".png" => ValidatePng(buffer),
            ".webp" => ValidateWebp(buffer),
            _ => (false, "Only JPEG, PNG and WebP images are allowed.", 0, 0, string.Empty)
        };
    }

    private static (bool, string?, int, int, string) ValidateJpeg(byte[] buffer)
    {
        if (buffer.Length < 4 || buffer[0] != 0xFF || buffer[1] != 0xD8 || buffer[2] != 0xFF)
            return (false, "Invalid JPEG image format.", 0, 0, string.Empty);

        var index = 2;
        while (index < buffer.Length - 1)
        {
            if (buffer[index] != 0xFF)
            {
                index++;
                continue;
            }

            var marker = buffer[index + 1];
            index += 2;

            if (marker is 0xD9 or 0xDA) // EOI or SOS (start of scan)
                break;

            if (index + 2 > buffer.Length) break;
            var length = BinaryPrimitives.ReadUInt16BigEndian(buffer.AsSpan(index, 2));

            // SOF0, SOF1, SOF2 (Start of Frame markers)
            if (marker is 0xC0 or 0xC1 or 0xC2 or 0xC3 or 0xC5 or 0xC6 or 0xC7 or 0xC9 or 0xCA or 0xCB)
            {
                if (index + 7 <= buffer.Length)
                {
                    var height = BinaryPrimitives.ReadUInt16BigEndian(buffer.AsSpan(index + 3, 2));
                    var width = BinaryPrimitives.ReadUInt16BigEndian(buffer.AsSpan(index + 5, 2));

                    if ((long)width * height > MaxPixelCount)
                        return (false, $"Image resolution exceeds maximum allowed 25 megapixels ({width}x{height}).", width, height, string.Empty);

                    return (true, null, width, height, "image/jpeg");
                }
            }

            index += length;
        }

        return (false, "Could not determine JPEG image dimensions.", 0, 0, string.Empty);
    }

    private static (bool, string?, int, int, string) ValidatePng(byte[] buffer)
    {
        ReadOnlySpan<byte> pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        if (buffer.Length < 24 || !buffer.AsSpan(0, 8).SequenceEqual(pngSignature))
            return (false, "Invalid PNG image format.", 0, 0, string.Empty);

        // IHDR chunk is immediately after signature
        var width = (int)BinaryPrimitives.ReadUInt32BigEndian(buffer.AsSpan(16, 4));
        var height = (int)BinaryPrimitives.ReadUInt32BigEndian(buffer.AsSpan(20, 4));

        if (width <= 0 || height <= 0)
            return (false, "Invalid PNG dimensions.", 0, 0, string.Empty);

        if ((long)width * height > MaxPixelCount)
            return (false, $"Image resolution exceeds maximum allowed 25 megapixels ({width}x{height}).", width, height, string.Empty);

        return (true, null, width, height, "image/png");
    }

    private static (bool, string?, int, int, string) ValidateWebp(byte[] buffer)
    {
        if (buffer.Length < 30 ||
            !buffer.AsSpan(0, 4).SequenceEqual("RIFF"u8) ||
            !buffer.AsSpan(8, 4).SequenceEqual("WEBP"u8))
        {
            return (false, "Invalid WebP image format.", 0, 0, string.Empty);
        }

        var chunkHeader = buffer.AsSpan(12, 4);
        if (chunkHeader.SequenceEqual("VP8 "u8) && buffer.Length >= 30)
        {
            var width = (int)(BinaryPrimitives.ReadUInt16LittleEndian(buffer.AsSpan(26, 2)) & 0x3FFF);
            var height = (int)(BinaryPrimitives.ReadUInt16LittleEndian(buffer.AsSpan(28, 2)) & 0x3FFF);

            if ((long)width * height > MaxPixelCount)
                return (false, $"Image resolution exceeds maximum allowed 25 megapixels ({width}x{height}).", width, height, string.Empty);

            return (true, null, width, height, "image/webp");
        }

        if (chunkHeader.SequenceEqual("VP8L"u8) && buffer.Length >= 25)
        {
            var b1 = buffer[21];
            var b2 = buffer[22];
            var b3 = buffer[23];
            var b4 = buffer[24];
            var width = 1 + (((b2 & 0x3F) << 8) | b1);
            var height = 1 + (((b4 & 0xF) << 10) | (b3 << 2) | ((b2 & 0xC0) >> 6));

            if ((long)width * height > MaxPixelCount)
                return (false, $"Image resolution exceeds maximum allowed 25 megapixels ({width}x{height}).", width, height, string.Empty);

            return (true, null, width, height, "image/webp");
        }

        if (chunkHeader.SequenceEqual("VP8X"u8) && buffer.Length >= 30)
        {
            var width = 1 + (buffer[24] | (buffer[25] << 8) | (buffer[26] << 16));
            var height = 1 + (buffer[27] | (buffer[28] << 8) | (buffer[29] << 16));

            if ((long)width * height > MaxPixelCount)
                return (false, $"Image resolution exceeds maximum allowed 25 megapixels ({width}x{height}).", width, height, string.Empty);

            return (true, null, width, height, "image/webp");
        }

        return (false, "Unsupported WebP format.", 0, 0, string.Empty);
    }
}
