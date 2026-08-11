export type CmsStatus = "Draft" | "Scheduled" | "Published" | "Archived";

export type CmsSeo = {
  title: string;
  description: string;
  canonicalPath?: string | null;
  ogImageUrl?: string | null;
  noIndex: boolean;
};

export type RichTextNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: RichTextNode[];
};

export type CmsBlockData = Record<string, unknown> & {
  eyebrow?: string;
  title?: string;
  text?: string;
  imageUrl?: string;
  imageAlt?: string;
  label?: string;
  href?: string;
  content?: RichTextNode;
  items?: Record<string, string>[];
};

export type CmsBlock = { id: string; type: string; data: CmsBlockData };
export type CmsDocument = { schemaVersion: number; seo: CmsSeo; blocks: CmsBlock[] };

export type CmsPageSummary = {
  id: string; slug: string; name: string; status: CmsStatus; isSystem: boolean;
  latestRevisionNumber: number; publishAtUtc: string | null; createdAt: string; updatedAt: string | null; rowVersion: string;
};

export type CmsPageDetail = CmsPageSummary & {
  draftRevisionId: string | null; publishedRevisionId: string | null; document: CmsDocument;
};

export type CmsPublishedPage = { slug: string; name: string; document: CmsDocument; publishedAt: string };
export type CmsRevision = { id: string; number: number; createdAt: string; createdBy: string; isPublished: boolean; isDraft: boolean };
export type MediaAsset = { id: string; storageKey: string; publicUrl: string; name: string; altText: string; contentType: string; length: number; createdAt: string };
