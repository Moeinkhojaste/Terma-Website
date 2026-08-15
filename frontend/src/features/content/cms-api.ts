import { apiRequest } from "@/lib/api-client";
import type { CmsDocument, CmsPageDetail, CmsPageSummary, CmsPublishedPage, CmsRevision, MediaAsset } from "./cms-types";

export const listCmsPages = (search?: string, status?: string) => {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  return apiRequest<CmsPageSummary[]>(`/api/admin/cms/pages${params.size ? `?${params}` : ""}`, { cache: "no-store" });
};
export const getCmsPage = (id: string) => apiRequest<CmsPageDetail>(`/api/admin/cms/pages/${id}`, { cache: "no-store" });
export const createCmsPage = (body: { slug: string; name: string }) => apiRequest<CmsPageDetail>("/api/admin/cms/pages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const saveCmsDraft = (page: CmsPageDetail) => apiRequest<CmsPageDetail>(`/api/admin/cms/pages/${page.id}/draft`, { method: "PUT", headers: { "Content-Type": "application/json", "If-Match": page.rowVersion }, body: JSON.stringify({ name: page.name, slug: page.slug, document: page.document }) });
export const publishCmsPage = (page: CmsPageDetail) => apiRequest<CmsPageDetail>(`/api/admin/cms/pages/${page.id}/publish`, { method: "POST", headers: { "If-Match": page.rowVersion } });
export const scheduleCmsPage = (page: CmsPageDetail, publishAtUtc: string) => apiRequest<CmsPageDetail>(`/api/admin/cms/pages/${page.id}/schedule`, { method: "POST", headers: { "Content-Type": "application/json", "If-Match": page.rowVersion }, body: JSON.stringify({ publishAtUtc }) });
export const archiveCmsPage = (page: CmsPageDetail) => apiRequest<void>(`/api/admin/cms/pages/${page.id}`, { method: "DELETE", headers: { "If-Match": page.rowVersion } });
export const getCmsRevisions = (id: string) => apiRequest<CmsRevision[]>(`/api/admin/cms/pages/${id}/revisions`, { cache: "no-store" });
export const restoreCmsRevision = (page: CmsPageDetail, revisionId: string) => apiRequest<CmsPageDetail>(`/api/admin/cms/pages/${page.id}/revisions/${revisionId}/restore`, { method: "POST", headers: { "If-Match": page.rowVersion } });
export const getPublishedCmsPage = (slug: string) => apiRequest<CmsPublishedPage>(`/api/store/cms/pages/${encodeURIComponent(slug)}`, { cache: "no-store" });
export const getPublishedSite = () => apiRequest<CmsPublishedPage>("/api/store/cms/site", { cache: "no-store" });
export const listCmsMedia = (search?: string) => apiRequest<MediaAsset[]>(`/api/admin/cms/media${search ? `?search=${encodeURIComponent(search)}` : ""}`, { cache: "no-store" });
export const uploadCmsMedia = (form: FormData) => apiRequest<MediaAsset>("/api/admin/cms/media", { method: "POST", body: form });
export const updateCmsMedia = (id: string, body: { name: string; altText: string }) => apiRequest<MediaAsset>(`/api/admin/cms/media/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export const deleteCmsMedia = (id: string) => apiRequest<void>(`/api/admin/cms/media/${id}`, { method: "DELETE" });

export function emptyCmsDocument(title: string): CmsDocument {
  return { schemaVersion: 1, seo: { title, description: "", canonicalPath: null, ogImageUrl: null, noIndex: false }, blocks: [] };
}
