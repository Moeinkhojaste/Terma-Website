import { apiRequest } from "@/lib/api-client";
export type PublicContent = { pageKey: string; sectionKey: string; title: string; body: string; linkUrl: string | null; imageUrl: string | null };
export function getPublicContent(page: string) { return apiRequest<PublicContent[]>(`/api/store/content?page=${encodeURIComponent(page)}`, { cache: "no-store" }); }
