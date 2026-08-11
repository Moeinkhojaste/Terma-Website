using Terma.Domain.Common;
using Terma.Domain.Exceptions;

namespace Terma.Domain.Entities;

public sealed class CmsRevision : BaseEntity
{
    public Guid PageId { get; private set; }
    public int Number { get; private set; }
    public string DocumentJson { get; private set; } = string.Empty;
    public string CreatedBy { get; private set; } = string.Empty;

    private CmsRevision() { }

    public CmsRevision(Guid pageId, int number, string documentJson, string createdBy)
    {
        if (pageId == Guid.Empty) throw new DomainException("Page is required.");
        if (number < 1) throw new DomainException("Revision number must be positive.");
        if (string.IsNullOrWhiteSpace(documentJson)) throw new DomainException("Revision document is required.");
        PageId = pageId;
        Number = number;
        DocumentJson = documentJson;
        CreatedBy = string.IsNullOrWhiteSpace(createdBy) ? "admin" : createdBy.Trim();
    }
}
