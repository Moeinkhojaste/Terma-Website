using Terma.Domain.Entities;

namespace Terma.UnitTests.Domain;

public sealed class StoreContentTests
{
    [Fact]
    public void Create_TrimsValuesAndSetsDefaults()
    {
        var content = new StoreContent(
            "  home  ",
            "  hero  ",
            "  Test Title  ",
            "  Test Body Content  ",
            "  /link  ",
            "  /image.jpg  ",
            "  SEO Title  ",
            "  SEO Desc  "
        );

        Assert.Equal("home", content.PageKey);
        Assert.Equal("hero", content.SectionKey);
        Assert.Equal("Test Title", content.Title);
        Assert.Equal("Test Body Content", content.Body);
        Assert.Equal("/link", content.LinkUrl);
        Assert.Equal("/image.jpg", content.ImageUrl);
        Assert.Equal("SEO Title", content.SeoTitle);
        Assert.Equal("SEO Desc", content.SeoDescription);
        Assert.True(content.IsPublished);
    }

    [Fact]
    public void Update_ModifiesPropertiesAndUpdatesTimestamp()
    {
        var content = new StoreContent("home", "hero", "Old Title", "Old Body", null, null, null, null);
        var initialUpdatedAt = content.UpdatedAt;

        content.Update("New Title", "New Body", "/new-link", "/new-img.jpg", "New SEO", "New Desc", false);

        Assert.Equal("New Title", content.Title);
        Assert.Equal("New Body", content.Body);
        Assert.Equal("/new-link", content.LinkUrl);
        Assert.Equal("/new-img.jpg", content.ImageUrl);
        Assert.False(content.IsPublished);
        Assert.NotNull(content.UpdatedAt);
        Assert.NotEqual(initialUpdatedAt, content.UpdatedAt);
    }
}
