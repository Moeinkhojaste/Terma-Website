const RECENTLY_VIEWED_KEY = "terma-recently-viewed";
const RECENT_SEARCHES_KEY = "terma-recent-searches";

export function readRecentlyViewed(storage: Pick<Storage, "getItem"> = window.localStorage): string[] {
  try {
    const parsed = JSON.parse(storage.getItem(RECENTLY_VIEWED_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(productId: string, storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage) {
  const next = [productId, ...readRecentlyViewed(storage).filter((id) => id !== productId)].slice(0, 8);
  storage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  return next;
}

export function readRecentSearches(storage: Pick<Storage, "getItem"> = window.localStorage): string[] {
  try {
    const parsed = JSON.parse(storage.getItem(RECENT_SEARCHES_KEY) ?? "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((query): query is string => typeof query === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function recordRecentSearch(query: string, storage: Pick<Storage, "getItem" | "setItem"> = window.localStorage) {
  const clean = query.trim();
  if (!clean) return readRecentSearches(storage);
  const next = [clean, ...readRecentSearches(storage).filter((item) => item !== clean)].slice(0, 5);
  storage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
  return next;
}
