using System.Text.Json;
using FluentValidation;
using Terma.Application.Cms;

namespace Terma.UnitTests.Application;

public sealed class CmsDocumentValidatorTests
{
    [Fact]
    public void Validate_AllowsKnownStructuredBlock()
    {
        var document = new CmsDocumentDto { Seo = new() { Title = "Page" }, Blocks = [new() { Id = Guid.NewGuid().ToString(), Type = "hero", Data = JsonSerializer.SerializeToElement(new { title = "Hello", primaryHref = "/products", imageUrl = "/images/example.webp" }) }] };
        CmsDocumentValidator.Validate(document);
    }

    [Fact]
    public void Validate_RejectsHtmlLikeCustomBlockAndUnsafeUrl()
    {
        var document = new CmsDocumentDto { Blocks = [new() { Id = Guid.NewGuid().ToString(), Type = "customHtml", Data = JsonSerializer.SerializeToElement(new { href = "javascript:alert(1)" }) }] };
        Assert.Throws<ValidationException>(() => CmsDocumentValidator.Validate(document));
    }
}
