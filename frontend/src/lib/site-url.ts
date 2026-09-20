const DEFAULT_SITE_URL = "https://termabrand.ir";

/**
 * Returns the canonical base URL of the website without a trailing slash.
 * Defaults to "https://termabrand.ir".
 */
export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  return url.replace(/\/+$/, "");
}
