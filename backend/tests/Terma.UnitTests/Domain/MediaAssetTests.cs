using Terma.Domain.Entities;
using Terma.Domain.Exceptions;

namespace Terma.UnitTests.Domain;

public sealed class MediaAssetTests
{
    [Fact]
    public void Constructor_SetsPropertiesCorrectly()
    {
        var media = new MediaAsset(
            storageKey: "uploads/2026/08/termeh-blue.webp",
            publicUrl: "/uploads/2026/08/termeh-blue.webp",
            name: "عکس ترمه شاه‌عباسی آبی",
            altText: "رومیزی ترمه سنتی یزد رنگ فیروزه‌ای",
            contentType: "image/webp",
            length: 120_500);

        Assert.Equal("uploads/2026/08/termeh-blue.webp", media.StorageKey);
        Assert.Equal("/uploads/2026/08/termeh-blue.webp", media.PublicUrl);
        Assert.Equal("عکس ترمه شاه‌عباسی آبی", media.Name);
        Assert.Equal("رومیزی ترمه سنتی یزد رنگ فیروزه‌ای", media.AltText);
        Assert.Equal("image/webp", media.ContentType);
        Assert.Equal(120_500, media.Length);
    }

    [Fact]
    public void Constructor_ThrowsDomainException_OnInvalidData()
    {
        // Missing key
        Assert.Throws<DomainException>(() => new MediaAsset("", "/url", "name", "alt", "image/webp", 100));

        // Missing url
        Assert.Throws<DomainException>(() => new MediaAsset("key", "", "name", "alt", "image/webp", 100));

        // Missing content type
        Assert.Throws<DomainException>(() => new MediaAsset("key", "/url", "name", "alt", "", 100));

        // Non-positive length
        Assert.Throws<DomainException>(() => new MediaAsset("key", "/url", "name", "alt", "image/webp", 0));
    }

    [Fact]
    public void Update_ModifiesNameAndAltText()
    {
        var media = new MediaAsset("key", "/url", "قدیمی", "توضیح قدیمی", "image/webp", 100);
        media.Update("جدید", "توضیح جدید");

        Assert.Equal("جدید", media.Name);
        Assert.Equal("توضیح جدید", media.AltText);
    }
}
