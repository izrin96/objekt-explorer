export function cacheHeaders(ttl?: number) {
  return {
    "Cache-Control": "max-age=15",
  };
}
