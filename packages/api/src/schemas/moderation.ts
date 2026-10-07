import * as z from "zod";

import { messageLength, storedCardSchema } from "./chat";
import { OFFER_STATUSES } from "./offer";

export { FLAG_CATEGORIES, type FlagCategory } from "./chat";

export const REPORT_REASONS = ["scam", "harassment", "spam", "impersonation", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const SANCTION_TYPES = ["warn", "chat_mute", "trade_block", "ban"] as const;
export type SanctionType = (typeof SANCTION_TYPES)[number];

export const MOD_ACTIONS = ["dismiss", ...SANCTION_TYPES] as const;
export type ModAction = (typeof MOD_ACTIONS)[number];

export const AUDIT_ACTIONS = [...MOD_ACTIONS, "revoke", "set_role"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const MUTE_DAYS = [1, 7, 30] as const;
export const REPORT_NOTE_MAX_LENGTH = 500;
export const MOD_REASON_MAX_LENGTH = 500;
export const EXCERPT_SIZE = 20;
export const REPORT_WINDOW_HOURS = 24;

export const STAFF_ROLES = ["moderator", "admin"] as const;

/** Better Auth stores several roles comma-separated; no role means `user`. */
export const roleList = (role: string | null | undefined) =>
  (role ?? "user").split(",").map((r) => r.trim());

/** Whether a session's `user.role` may open the moderator console. */
export const isStaffRole = (role: string | null | undefined) =>
  roleList(role).some((r) => (STAFF_ROLES as readonly string[]).includes(r));

export const userIdInputSchema = z.object({ userId: z.string().min(1) });

export const reportInputSchema = z.object({
  userId: z.string().min(1),
  reason: z.enum(REPORT_REASONS),
  note: z
    .string()
    .trim()
    .refine((note) => messageLength(note) <= REPORT_NOTE_MAX_LENGTH, { message: "too_long" })
    .optional(),
  /** set when reporting from a conversation */
  conversationId: z.number().int().positive().optional(),
  /** share the conversation's last 20 messages; ignored without `conversationId` */
  share: z.boolean().default(true),
  alsoBlock: z.boolean().default(false),
  /** Report a problem: a trade between the reporter and the reported account */
  tradeId: z.number().int().positive().optional(),
});

const modReasonSchema = z
  .string()
  .trim()
  .min(1)
  .refine((reason) => messageLength(reason) <= MOD_REASON_MAX_LENGTH, { message: "too_long" });

export const actInputSchema = z
  .object({
    userId: z.string().min(1),
    action: z.enum(MOD_ACTIONS),
    /** chat mute: 1, 7 or 30; ban: optional, none means no end */
    days: z.number().int().positive().max(3650).optional(),
    reason: modReasonSchema,
  })
  .refine(
    (input) =>
      input.action === "chat_mute"
        ? (MUTE_DAYS as readonly number[]).includes(input.days ?? 0)
        : input.action === "ban" || input.days === undefined,
    { message: "invalid_days", path: ["days"] },
  );
export type ActInput = z.infer<typeof actInputSchema>;

export const revokeInputSchema = z.object({
  sanctionId: z.number().int().positive(),
  reason: modReasonSchema,
});

export const setRoleInputSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["user", "moderator"]),
});

const excerptOfferItemSchema = z.object({
  collectionSlug: z.string(),
  objektId: z.string().nullable(),
  serial: z.number().nullable(),
});

/** An offer as it stood at the report: `give` and `get` are the reported account's sides. */
export const excerptOfferSchema = z.object({
  offerId: z.number(),
  status: z.enum(OFFER_STATUSES),
  give: excerptOfferItemSchema.array(),
  get: excerptOfferItemSchema.array(),
  topup: z
    .object({ amount: z.string(), currency: z.string(), payer: z.enum(["target", "reporter"]) })
    .nullable(),
  note: z.string().nullable(),
});
export type ExcerptOffer = z.infer<typeof excerptOfferSchema>;

/** A shared message as the report keeps it; `fromTarget` is true for the reported account's messages. */
export const excerptEntrySchema = z.object({
  fromTarget: z.boolean(),
  body: z.string().nullable(),
  card: storedCardSchema.nullable(),
  /** absent on reports filed before offers were kept */
  offer: excerptOfferSchema.nullable().optional(),
  at: z.string(),
});
export type ExcerptEntry = z.infer<typeof excerptEntrySchema>;

/** The ban sign-in error's message: data only, so the client words it in the viewer's language. */
export const banNoticeSchema = z.object({ reason: z.string(), until: z.string().nullable() });
export type BanNotice = z.infer<typeof banNoticeSchema>;

export function banNoticeMessage(
  reason: string | null | undefined,
  until: Date | null | undefined,
) {
  return JSON.stringify({
    reason: reason ?? "",
    until: until ? until.toISOString() : null,
  } satisfies BanNotice);
}

/** The ban details from a `BANNED_USER` sign-in error's message, or null for any other message. */
export function parseBanNotice(message: string | undefined): BanNotice | null {
  if (!message) return null;
  try {
    const parsed = banNoticeSchema.safeParse(JSON.parse(message));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
