/**
 * The router's default JSON-encodes arrays; a shared link carries them as one
 * comma-joined key (`?member=a,b`). Values leave as strings; `filterSearchSchema`
 * splits and coerces them back, and accepts the repeated `?member=a&member=b`
 * spelling too.
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
      const items = value.map(toParam).filter((item) => item !== null);
      if (items.length > 0) params.append(key, items.join(","));
      continue;
    }
    const param = toParam(value);
    if (param !== null) params.append(key, param);
  }
  // Every `,` goes back to the literal the link carries, values included and not
  // just the joins: the router re-stringifies the *unvalidated* parse to decide
  // whether a URL needs rewriting, and there a comma-joined key is still one
  // string. Escaping it there would never match the address bar, and the
  // redirect it issues is to this same text — an endless loop on first paint.
  const query = params.toString().replaceAll("%2C", ",");
  return query.length > 0 ? `?${query}` : "";
}
