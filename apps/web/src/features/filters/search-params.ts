/**
 * Repeated-key serialisation, because the router's default JSON-encodes arrays
 * and `?member=a&member=b` is what a website link carries. Values leave as
 * strings; `filterSearchSchema` coerces them back.
 */
export function parseSearch(searchStr: string): Record<string, unknown> {
  const params = new URLSearchParams(searchStr);
  const result: Record<string, unknown> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    result[key] = values.length > 1 ? values : values[0];
  }
  return result;
}

function toParam(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  // sorted, so the same filters always produce the same URL
  for (const key of Object.keys(search).sort()) {
    const value = search[key];
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        const param = toParam(item);
        if (param !== null) params.append(key, param);
      }
      continue;
    }
    const param = toParam(value);
    if (param !== null) params.append(key, param);
  }
  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}
