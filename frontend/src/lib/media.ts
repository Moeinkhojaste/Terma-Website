/**
 * Normalizes media URLs so that internal Docker hostnames (e.g. prod-backend:8080)
 * are never leaked to client browsers, and root-relative paths (/api/media/...) are preserved.
 */
export function normalizeMediaUrl(value: string | undefined | null): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // If internal Docker container URL is present, strip it down to the path
  if (/^https?:\/\/(prod-backend|staging-backend|backend)(:\d+)?/i.test(trimmed)) {
    return trimmed.replace(/^https?:\/\/(prod-backend|staging-backend|backend)(:\d+)?/i, "");
  }

  // Already a valid absolute URL (http/https) or static public image (/images/)
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/images/")) {
    return trimmed;
  }

  // Same-origin API route (e.g. /api/media/...)
  if (trimmed.startsWith("/api/")) {
    return trimmed;
  }

  if (trimmed.startsWith("api/")) {
    return `/${trimmed}`;
  }

  return trimmed;
}

/**
 * Determines whether Next.js Image component should bypass its image optimization pipeline.
 * Uploaded backend media files are already compressed as WebP by the backend image optimizer
 * and served with long-term immutable cache headers.
 */
export function isUnoptimizedMedia(src: string | undefined | null): boolean {
  if (!src) return false;
  return (
    src.startsWith("/api/") ||
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
  );
}
