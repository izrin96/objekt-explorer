import type { ValidObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

import { FLAG_CATEGORIES } from "./chat";
import { REPORT_REASONS, SANCTION_TYPES } from "./moderation";
import { CANCEL_REQUEST_STATUSES, TRADE_CANCEL_REASONS, TRADE_STATUSES } from "./offer";

// Every string in these outputs is a date, an enum, an id, a name or a hash, plus the staff
// trade's indexer collection metadata: the staff reads carry no message text, offer note, report
// note, excerpt or sanction reason.

export const STAFF_RANGE_DAYS = [7, 30, 90] as const;
export const DEFAULT_STAFF_RANGE = 30;
export const staffDaysSchema = z.union([z.literal(7), z.literal(30), z.literal(90)]);
export type StaffDays = z.infer<typeof staffDaysSchema>;

export const staffRangeInputSchema = z.object({
  days: staffDaysSchema.default(DEFAULT_STAFF_RANGE),
});

export const staffTradeInputSchema = z.object({
  tradeId: z.number().int().positive().max(2_147_483_647),
});

/** A trade in progress this long after accept is stalled. */
export const STALLED_DAYS = 7;
export const ATTENTION_LIMIT = 200;
export const REPEAT_BREAKER_MIN = 2;
export const REPEAT_BREAKER_LIMIT = 50;
export const MOST_FLAGGED_LIMIT = 20;

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const instantSchema = z.string();

const seriesSchema = <K extends readonly [string, ...string[]]>(keys: K) => {
  const counts = z.record(z.enum(keys), z.number().int());
  return z.object({ days: z.object({ day: daySchema, counts }).array(), sum: counts });
};

export const OFFER_TOTAL_KEYS = [
  "created",
  "accepted",
  "declined",
  "withdrawn",
  "countered",
  "expired",
  "cancelled",
  "cancelled_reserved",
  "cancelled_blocked",
  "cancelled_sanction",
  "cancelled_token_moved",
  "cancelled_account_deleted",
  "cancelled_not_transferable",
] as const;

export const TRADE_TOTAL_KEYS = [
  "completed",
  "cancelled",
  "failed",
  "cancelled_party",
  "cancelled_agreed",
  "cancelled_token_moved",
  "cancelled_not_transferable",
  "cancelled_expired",
  "failed_broken",
  "failed_expired",
] as const;

export const MESSAGE_TOTAL_KEYS = [
  "messages",
  "conversations",
  "flags",
  ...FLAG_CATEGORIES.map((c) => `flag_${c}` as const),
  "reports",
  ...REPORT_REASONS.map((r) => `report_${r}` as const),
  "sanctions",
  ...SANCTION_TYPES.map((t) => `sanction_${t}` as const),
] as const;

export const tradeTotalsSchema = z.object({
  days: staffDaysSchema,
  countedAt: instantSchema,
  offers: seriesSchema(OFFER_TOTAL_KEYS),
  trades: seriesSchema(TRADE_TOTAL_KEYS),
  /** accept to completed, over the trades completed in the range; null with none */
  timeToComplete: z.object({
    count: z.number().int(),
    medianSeconds: z.number().nullable(),
    p90Seconds: z.number().nullable(),
  }),
});
export type TradeTotals = z.infer<typeof tradeTotalsSchema>;

/** An account as staff see it; `name` is null once the account is gone. */
export const staffPersonSchema = z.object({ userId: z.string(), name: z.string().nullable() });

export const ATTENTION_REASONS = [
  "stalled",
  "failed",
  "away",
  "stuck",
  "copy",
  "cancel_ask",
] as const;
export type AttentionReason = (typeof ATTENTION_REASONS)[number];

export const tradeAttentionSchema = z.object({
  rows: z
    .object({
      tradeId: z.number().int(),
      status: z.enum(TRADE_STATUSES),
      acceptedAt: instantSchema,
      parties: z.tuple([staffPersonSchema, staffPersonSchema]),
      legsDone: z.number().int(),
      legsTotal: z.number().int(),
      /** `at`: stalled and failed, the accept and the end; away, when the leg breaks; stuck,
       * when it was marked; copy, when it counts as accepted (null before the worker saw it);
       * cancel_ask, when it was asked */
      reasons: z
        .object({ reason: z.enum(ATTENTION_REASONS), at: instantSchema.nullable() })
        .array(),
    })
    .array(),
  total: z.number().int(),
  repeatBreakers: z.object({ person: staffPersonSchema, failed: z.number().int() }).array(),
});
export type TradeAttention = z.infer<typeof tradeAttentionSchema>;

export const trackerHealthSchema = z.object({
  checkedAt: instantSchema,
  indexer: z.discriminatedUnion("state", [
    z.object({
      state: z.literal("known"),
      seenUntil: instantSchema,
      readAt: instantSchema,
      behind: z.boolean(),
    }),
    z.object({ state: z.literal("unknown") }),
  ]),
  verifierLastRun: instantSchema.nullable(),
  open: z.object({
    legs: z.number().int(),
    away: z.number().int(),
    stuck: z.number().int(),
    copies: z.number().int(),
  }),
});
export type TrackerHealth = z.infer<typeof trackerHealthSchema>;

export const STAFF_TIMELINE_KINDS = [
  "proposed",
  "accepted",
  "leg_verified",
  "leg_confirmed",
  "leg_away",
  "leg_stuck",
  "copy_sent",
  "copy_accepted",
  "copy_declined",
  "cancel_asked",
  "cancel_accepted",
  "cancel_declined",
  "cancel_withdrawn",
  "cancel_lapsed",
  "completed",
  "cancelled",
  "failed",
] as const;

export const staffTimelineRowSchema = z.object({
  at: instantSchema,
  kind: z.enum(STAFF_TIMELINE_KINDS),
  /** who acted: a leg's giver, a confirming receiver, the asker or answerer, who cancelled */
  userId: z.string().nullable(),
  legId: z.number().int().nullable(),
  /** a wrong copy the worker accepted at its deadline */
  auto: z.boolean(),
  /** on cancelled; on failed, `expired` or null for a broken leg */
  reason: z.enum(TRADE_CANCEL_REASONS).nullable(),
});
export type StaffTimelineRow = z.infer<typeof staffTimelineRowSchema>;

const shownSerialFields = {
  serial: z.number().nullable(),
  serialEstimated: z.boolean(),
};

export const staffTradeSchema = z.object({
  id: z.number().int(),
  offerId: z.number().int(),
  status: z.enum(TRADE_STATUSES),
  cancelReason: z.enum(TRADE_CANCEL_REASONS).nullable(),
  proposedAt: instantSchema,
  acceptedAt: instantSchema,
  endedAt: instantSchema.nullable(),
  parties: z
    .object({
      person: staffPersonSchema,
      /** active sanctions by type; never their reason */
      sanctions: z.enum(SANCTION_TYPES).array(),
    })
    .array(),
  legs: z
    .object({
      id: z.number().int(),
      fromUserId: z.string(),
      toUserId: z.string(),
      collectionSlug: z.string(),
      objektId: z.string().nullable(),
      ...shownSerialFields,
      state: z.enum(["verified", "waiting", "closed"]),
      verifiedAt: instantSchema.nullable(),
      confirmedAt: instantSchema.nullable(),
      txHash: z.string().nullable(),
      /** set when the leg verified through a wrong copy */
      verifiedSerial: z.number().nullable(),
      verifiedSerialEstimated: z.boolean(),
      autoAccepted: z.boolean(),
      awayAt: instantSchema.nullable(),
      breaksAt: instantSchema.nullable(),
      untransferableAt: instantSchema.nullable(),
    })
    .array(),
  copies: z
    .object({
      id: z.number().int(),
      legId: z.number().int(),
      objektId: z.string(),
      ...shownSerialFields,
      txHash: z.string(),
      transferredAt: instantSchema,
      /** `lapsed`: still pending when its leg closed, so never decided */
      status: z.enum(["pending", "accepted", "declined", "lapsed"]),
      decidedAt: instantSchema.nullable(),
      acceptBy: instantSchema.nullable(),
      autoAccepted: z.boolean(),
    })
    .array(),
  cancelRequests: z
    .object({
      askedBy: z.string(),
      askedAt: instantSchema,
      status: z.enum([...CANCEL_REQUEST_STATUSES, "lapsed"]),
      answeredAt: instantSchema.nullable(),
    })
    .array(),
  timeline: staffTimelineRowSchema.array(),
  /** indexer collection metadata for the legs' and copies' slugs, as the console reads it */
  collections: z.record(z.string(), z.custom<ValidObjekt>()),
});
export type StaffTrade = z.infer<typeof staffTradeSchema>;

export const messageTotalsSchema = z.object({
  days: staffDaysSchema,
  countedAt: instantSchema,
  totals: seriesSchema(MESSAGE_TOTAL_KEYS),
  mostFlagged: z
    .object({
      person: staffPersonSchema,
      counts: z.record(z.enum(FLAG_CATEGORIES), z.number().int()),
      total: z.number().int(),
    })
    .array(),
});
export type MessageTotals = z.infer<typeof messageTotalsSchema>;
