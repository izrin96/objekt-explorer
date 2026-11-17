import * as z from "zod";

const SESSION_COOKIE = "user-session";

/**
 * The `user-session` cookie of a login response; null when it is absent or empty.
 * `expiresAt` comes from `Max-Age` or `Expires` and is null for a cookie with neither.
 */
export function parseSessionCookie(setCookie: string[], now = Date.now()) {
  for (const line of setCookie) {
    const [pair = "", ...attributes] = line.split(";");
    const eq = pair.indexOf("=");
    if (eq === -1 || pair.slice(0, eq).trim() !== SESSION_COOKIE) continue;
    const value = pair.slice(eq + 1).trim();
    if (!value) return null;
    const attribute = (name: string) => {
      const prefix = `${name}=`;
      const hit = attributes
        .map((a) => a.trim())
        .find((a) => a.slice(0, prefix.length).toLowerCase() === prefix);
      return hit?.slice(prefix.length);
    };
    // Max-Age wins over Expires, as in browsers
    const maxAge = Number(attribute("max-age"));
    const expires = new Date(attribute("expires") ?? Number.NaN);
    const expiresAt = Number.isFinite(maxAge)
      ? new Date(now + maxAge * 1000)
      : Number.isNaN(expires.getTime())
        ? null
        : expires;
    return { value, expiresAt };
  }
  return null;
}

// A status Cosmo adds later must not fail the poll: it maps to `unknown`.
export const ticketStatusSchema = z
  .object({ status: z.string() })
  .loose()
  .pipe(
    z.union([
      z.object({
        status: z.literal("wait_for_user_action"),
        ticketRemainingMs: z.number(),
      }),
      // of the scanning user's profile only the nickname is kept, to show who is signing in
      z
        .object({
          status: z.literal("wait_for_certify"),
          ticketRemainingMs: z.number(),
          ticketOtpRemainingMs: z.number(),
          user: z.object({ nickname: z.string() }).nullish(),
        })
        .transform(({ user, ...rest }) => ({ ...rest, nickname: user?.nickname ?? null })),
      z.object({ status: z.literal("certified") }),
      z.any().transform(() => ({ status: "unknown" as const })),
    ]),
  );
export type TicketStatus = z.infer<typeof ticketStatusSchema>;

// `users/me` also carries email, birth date and country: personal data that is never kept
export const sessionUserSchema = z.object({
  nickname: z.string(),
  address: z.string().min(1),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

// Only the id is required: a collection missing a colour still carries its media
const summaryCollectionSchema = z.object({
  collectionId: z.string(),
  frontMedia: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  bandImageUrl: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  hasVoice: z
    .boolean()
    .nullish()
    .transform((v) => v ?? false),
  backImage: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  accentColor: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
  textColor: z
    .string()
    .nullish()
    .transform((v) => v ?? null),
});
export type SummaryCollection = z.infer<typeof summaryCollectionSchema>;

// What only an objekt's holder sees; every other field Cosmo sends is dropped as it parses
const summaryObjektSchema = z
  .object({
    metadata: z.object({
      tokenId: z.number().int().positive().safe(),
      objektNo: z.number().int().positive(),
      collectionId: z.string(),
      transferable: z.boolean(),
    }),
    inventory: z.object({
      usedForGrid: z
        .boolean()
        .nullish()
        .transform((v) => v ?? false),
      owner: z
        .string()
        .regex(/^0x[0-9a-fA-F]{40}$/)
        .transform((v) => v.toLowerCase()),
      status: z.string(),
    }),
    nonTransferableReason: z
      .string()
      .nullish()
      .transform((v) => (v == null ? null : /^[a-z0-9-]{1,64}$/.test(v) ? v : "other")),
  })
  .transform(({ metadata, inventory, nonTransferableReason }) => ({
    tokenId: String(metadata.tokenId),
    objektNo: metadata.objektNo,
    collectionId: metadata.collectionId,
    transferable: metadata.transferable,
    nonTransferableReason,
    usedForGrid: inventory.usedForGrid,
    owner: inventory.owner,
    status: inventory.status,
  }));
export type SummaryObjekt = z.infer<typeof summaryObjektSchema>;

// `count` and `objekts` never cost the collection its media: a null or malformed one reads as absent
const summaryItemSchema = z.object({
  collection: summaryCollectionSchema,
  count: z.number().nullish().catch(null),
  objekts: z.array(z.unknown()).nullish().catch(null),
});

// Each item parses alone, so one malformed collection costs one `skipped`, not the page.
// Each objekt parses alone too: a bad one adds to `skippedObjekts`, never to `skipped`.
export const objektSummariesSchema = z
  .object({
    collectionCount: z.number(),
    collections: z.array(z.unknown()),
  })
  .transform(({ collectionCount, collections: items }) => {
    const collections: SummaryCollection[] = [];
    const objekts: SummaryObjekt[] = [];
    let skipped = 0;
    let skippedObjekts = 0;
    let partial = 0;
    for (const item of items) {
      const parsed = summaryItemSchema.safeParse(item);
      if (!parsed.success) {
        skipped++;
        continue;
      }
      const { collection, count, objekts: entries } = parsed.data;
      collections.push(collection);
      for (const entry of entries ?? []) {
        const objekt = summaryObjektSchema.safeParse(entry);
        if (objekt.success) objekts.push(objekt.data);
        else skippedObjekts++;
      }
      if (count != null && entries && count !== entries.length) partial++;
    }
    return { collectionCount, collections, skipped, objekts, skippedObjekts, partial };
  });
export type ObjektSummaries = z.infer<typeof objektSummariesSchema>;

export type CosmoErrorKind = "refused" | "dead" | "unavailable" | "busy" | "unexpected";

function hasErrorBody(body: unknown) {
  if (typeof body === "string") {
    try {
      return hasErrorBody(JSON.parse(body));
    } catch {
      return false;
    }
  }
  return typeof body === "object" && body !== null && "error" in body;
}

/**
 * `status` is null when no response came (a timeout, a refused connection).
 * A 403 whose body is not Cosmo's own JSON error is a firewall page, not a dead session.
 */
export function errorKindOf(
  status: number | null,
  body: unknown,
  withCookie: boolean,
): CosmoErrorKind {
  if (status === null || status >= 500) return "unavailable";
  if ((status === 401 || status === 403) && withCookie && hasErrorBody(body)) return "dead";
  if (status === 403 && !hasErrorBody(body)) return "unavailable";
  if (status === 429) return "busy";
  if (status >= 400) return "refused";
  return "unexpected";
}
