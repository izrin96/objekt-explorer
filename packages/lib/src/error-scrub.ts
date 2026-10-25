import type { Breadcrumb, DataCollection, Event } from "@sentry/core";

// Error reports carry no personal data: private stays private (packages/api/AGENTS.md).

/** What the SDK may collect on its own: nothing personal, before `scrubEvent` even runs. */
export const DATA_COLLECTION = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { allow: ["user-agent"] }, response: false },
  httpBodies: [],
  urlQueryParams: false,
  graphQL: { document: false, variables: false },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  stackFrameVariables: false,
} satisfies DataCollection;

const EMAIL = /[\w.%+-]+@[a-z\d-]+(?:\.[a-z\d-]+)*\.[a-z]{2,}/gi;
// with or without `0x`; a 64-hex hash is no address
const WALLET = /\b(?:0x)?[\da-f]{40}\b/gi;
// a profile path names its owner
const PROFILE_PATH = /\/@[^\s/?#"'<>)]+/g;
// oRPC sends a GET's input as `?data=`, so a query string is never kept, on a URL or a bare path
const URL_QUERY = /([^\s?"'<>]*\/[^\s?"'<>]*)\?[^\s"'<>]*/g;

// Postgres and Drizzle quote the values that failed: a chat body, a note, an address
const DB_VALUES: ReadonlyArray<[RegExp, string]> = [
  // Drizzle appends the bound values of a failed query
  [/\nparams: [\s\S]*$/, "\nparams: [scrubbed]"],
  // unique and foreign-key violations: Key (col)=(value)
  [
    /(Key \([^)]*\)=\().*?(\)(?: already exists| is not present| conflicts)|\)$)/gm,
    "$1[scrubbed]$2",
  ],
  // not-null and check violations
  [/(Failing row contains \().*(\))/g, "$1[scrubbed]$2"],
  // invalid input syntax for type uuid: "…", invalid input value for enum x: "…"
  [/(invalid input (?:syntax|value) for [^:"]+: )"[^"]*"/gi, '$1"[scrubbed]"'],
  // value "…" is out of range, and the like
  [/(\bvalue )"[^"]*"/gi, '$1"[scrubbed]"'],
];

// chat bodies, offer notes, credentials, request bodies and stack-frame locals
const PRIVATE_KEY =
  /^(authorization|cookies?|set-cookie|password|secret|token|access_?token|refresh_?token|id_?token|email|body|note|notes|text|input|data|query_string|headers|vars)$/i;

const MAX_DEPTH = 10;

export function scrubText(text: string) {
  let out = text;
  for (const [pattern, replacement] of DB_VALUES) out = out.replace(pattern, replacement);
  return out
    .replace(EMAIL, "[email]")
    .replace(URL_QUERY, "$1")
    .replace(PROFILE_PATH, "/@[user]")
    .replace(WALLET, "[address]");
}

/** A URL or path without its query string or hash, then scrubbed. */
export function scrubUrl(url: string) {
  return scrubText(url.split(/[?#]/, 1)[0] ?? "");
}

function scrubValue(value: unknown, depth: number): unknown {
  if (typeof value === "string") return scrubText(value);
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[depth]";
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!PRIVATE_KEY.test(key)) out[key] = scrubValue(item, depth + 1);
  }
  return out;
}

const BREADCRUMB_DATA = ["method", "status_code"] as const;
// a clicked element's selector keeps its tag, id and classes; these attributes carry its text
const SELECTOR_TEXT = /\[(?:aria-label|title|alt)=(?:"[^"]*"|'[^']*'|[^\]]*)\]/g;
const BREADCRUMB_URLS = ["url", "from", "to"] as const;

/** `null` drops the breadcrumb: console lines can print request inputs. */
export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  if (breadcrumb.category === "console") return null;
  const { data, message, ...rest } = breadcrumb;
  const out: Breadcrumb = { ...rest };
  if (message !== undefined) {
    out.message = scrubText(
      breadcrumb.category === "ui.click" ? message.replace(SELECTOR_TEXT, "") : message,
    );
  }
  if (data) {
    const kept: Record<string, unknown> = {};
    for (const key of BREADCRUMB_DATA) if (key in data) kept[key] = data[key];
    for (const key of BREADCRUMB_URLS) {
      const value: unknown = data[key];
      if (typeof value === "string") kept[key] = scrubUrl(value);
    }
    out.data = kept;
  }
  return out;
}

export function scrubEvent<T extends Event>(event: T): T {
  const {
    request,
    user,
    breadcrumbs,
    transaction,
    sdkProcessingMetadata,
    debug_meta,
    release,
    ...rest
  } = event;
  const out = scrubValue(rest, 0) as T;
  // SDK-internal data and build ids (a release may be a 40-hex git sha), never user content
  if (sdkProcessingMetadata) out.sdkProcessingMetadata = sdkProcessingMetadata;
  if (debug_meta) out.debug_meta = debug_meta;
  if (release !== undefined) out.release = release;
  if (transaction !== undefined) out.transaction = scrubUrl(transaction);
  if (user?.id !== undefined) out.user = { id: String(user.id) };
  if (request) {
    const userAgent = request.headers?.["user-agent"] ?? request.headers?.["User-Agent"];
    out.request = {
      ...(request.method ? { method: request.method } : {}),
      ...(request.url ? { url: scrubUrl(request.url) } : {}),
      ...(userAgent ? { headers: { "user-agent": userAgent } } : {}),
    };
  }
  if (breadcrumbs) {
    out.breadcrumbs = breadcrumbs.flatMap((breadcrumb) => scrubBreadcrumb(breadcrumb) ?? []);
  }
  return out;
}

/**
 * A refusal the app expects and shows to the user: any oRPC error under 500, or anything
 * carrying a `data.reason` code (chat and offer refusals use bare codes, so no list is checked).
 */
export function isExpectedError(error: unknown) {
  if (error === null || typeof error !== "object") return false;
  const { status, code, data } = error as { status?: unknown; code?: unknown; data?: unknown };
  if (
    data !== null &&
    typeof data === "object" &&
    typeof (data as { reason?: unknown }).reason === "string"
  ) {
    return true;
  }
  return typeof status === "number" && typeof code === "string" && status < 500;
}
