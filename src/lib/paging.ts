/**
 * Long lists load in pages. The first page is small so the screen appears quickly; "Show older"
 * asks for a bigger `limit` in the URL, which keeps the page shareable and works with a refresh.
 */
const MAX_LIMIT = 500;

/** The number of rows to load, from the `limit` search param. Falls back to `pageSize` when missing or bad. */
export function limitFromParam(raw: string | undefined, pageSize: number): number {
  const n = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n < pageSize) return pageSize;
  return Math.min(n, MAX_LIMIT);
}

/** Splits a fetch of `limit + 1` rows into the visible rows and whether an older page exists. */
export function takePage<T>(rows: T[], limit: number): { items: T[]; hasMore: boolean } {
  return { items: rows.slice(0, limit), hasMore: rows.length > limit };
}
