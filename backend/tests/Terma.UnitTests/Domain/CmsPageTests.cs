using Terma.Domain.Entities;
using Terma.Domain.Exceptions;

namespace Terma.UnitTests.Domain;

public sealed class CmsPageTests
{
    [Fact]
    public void Create_NormalizesSlugAndStartsAsDraft()
    {
        var page = new CmsPage("  Privacy-Policy  ", "حریم خصوصی");
        Assert.Equal("privacy-policy", page.Slug);
        Assert.Equal(CmsPageStatus.Draft, page.Status);
        Assert.Equal(1, page.RowVersion);
    }

    [Theory]
    [InlineData("admin")]
    [InlineData("two--hyphens")]
    [InlineData("فارسی")]
    public void Create_InvalidOrReservedSlug_Throws(string slug) => Assert.Throws<DomainException>(() => new CmsPage(slug, "Page"));

    [Fact]
    public void SystemPage_CannotBeRenamedOrArchived()
    {
        var page = new CmsPage("home", "صفحه اصلی", true);
        Assert.Throws<DomainException>(() => page.Rename("new-home", "صفحه اصلی"));
        Assert.Throws<DomainException>(page.Archive);
    }

    [Fact]
    public void DraftScheduleAndPublish_KeepRevisionBoundaries()
    {
        var now = DateTime.UtcNow;
        var revision = Guid.NewGuid();
        var page = new CmsPage("campaign", "کمپین");
        page.SaveDraft(revision);
        page.Schedule(revision, now.AddMinutes(5), now);
        page.PublishScheduled(now.AddMinutes(4));
        Assert.Equal(CmsPageStatus.Scheduled, page.Status);
        page.PublishScheduled(now.AddMinutes(5));
        Assert.Equal(CmsPageStatus.Published, page.Status);
        Assert.Equal(revision, page.PublishedRevisionId);
        Assert.Null(page.PublishAtUtc);
    }
}
