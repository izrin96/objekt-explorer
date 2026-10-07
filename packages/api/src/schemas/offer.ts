import * as z from "zod";

import { chatPartnerSchema, chatTargetSchema, FLAG_CATEGORIES } from "./chat";
import { collectionFiltersSchema } from "./common/filters";
import { reputationSchema } from "./reputation";

export const OFFER_SIDE_LIMIT = 50;
export const OFFER_NOTE_MAX_LENGTH = 280;
export const OPEN_OFFER_LIMIT = 20;
export const TOPUP_MAX = 9_999_999_999.99;
export const CANDIDATE_PAGE_SIZE = 200;
export const HISTORY_PAGE_SIZE = 20;
export const REMIND_AFTER_HOURS = 72;
export const REPORT_AFTER_DAYS = 7;
export const RATE_WINDOW_DAYS = 14;

export const TRADE_RATINGS = ["positive", "neutral", "negative"] as const;
export type TradeRating = (typeof TRADE_RATINGS)[number];

export const OFFER_STATUSES = [
  "open",
  "accepted",
  "declined",
  "withdrawn",
  "countered",
  "cancelled",
  "expired",
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

const OFFER_CANCEL_REASONS = ["reserved", "blocked", "sanction", "token_moved"] as const;
export type OfferCancelReason = (typeof OFFER_CANCEL_REASONS)[number];

const TRADE_STATUSES = ["in_progress", "completed", "cancelled", "failed"] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];

const TRADE_CANCEL_REASONS = ["party", "token_moved"] as const;
export type TradeCancelReason = (typeof TRADE_CANCEL_REASONS)[number];

const OFFER_ACTIONS = ["accept", "decline", "counter", "withdraw"] as const;
export type OfferAction = (typeof OFFER_ACTIONS)[number];

const OFFER_SIDES = ["give", "get"] as const;
export type OfferSide = (typeof OFFER_SIDES)[number];

/** `from` is the offer's sender. */
const TOPUP_PAYERS = ["from", "to"] as const;
export type TopupPayer = (typeof TOPUP_PAYERS)[number];

/** `data.reason` on a refused offer action; the chat ones keep chat's meaning. */
export const OFFER_REFUSALS = [
  "not_owned",
  "not_transferable",
  "reserved",
  "not_listed",
  "empty",
  "too_many",
  "invalid_topup",
  "too_many_open",
  "not_open",
  "expired",
  "not_allowed",
  "trade_blocked",
  "trade_ended",
  "locked",
  "not_completed",
  "rating_closed",
  "no_address",
  "self",
  "not_accepting",
  "start_limit",
  "message_limit",
  "muted",
] as const;
export type OfferRefusal = (typeof OFFER_REFUSALS)[number];

const idSchema = z.number().int().positive();
const slugSchema = z.string().min(1).max(255);
const objektIdSchema = z.string().min(1).max(255);

/** Exactly one: an existing conversation, or a Message target to open one with. */
const addressedSchema = z.object({
  conversationId: idSchema.optional(),
  target: chatTargetSchema.optional(),
});
const addressed = (input: z.infer<typeof addressedSchema>) =>
  (input.conversationId === undefined) !== (input.target === undefined);

/** A give item is always one specific objekt. */
const giveItemInputSchema = z.object({
  collectionSlug: slugSchema,
  objektId: objektIdSchema,
});

/** No `objektId` asks for any copy of the collection; `listSlug` names the list it was picked from. */
const getItemInputSchema = z.object({
  collectionSlug: slugSchema,
  objektId: objektIdSchema.optional(),
  listSlug: z.string().min(1).max(12).optional(),
});

const topupInputSchema = z.object({
  amount: z.number(),
  currency: z.string().min(1).max(10),
  payer: z.enum(TOPUP_PAYERS),
});
export type TopupInput = z.infer<typeof topupInputSchema>;

const specificIds = (items: { objektId?: string }[]) =>
  items.flatMap((item) => (item.objektId === undefined ? [] : [item.objektId]));

/** Side limits are checked by `validateShape`, so they come back as refusals, not validation errors. */
export const createOfferInputSchema = addressedSchema
  .extend({
    give: giveItemInputSchema.array().max(50),
    get: getItemInputSchema.array().max(50),
    topup: topupInputSchema.optional(),
    note: z
      .string()
      .trim()
      .refine((note) => Array.from(note).length <= OFFER_NOTE_MAX_LENGTH, { message: "too_long" })
      .optional(),
  })
  .refine(addressed, { message: "conversation_or_target" })
  .refine(
    (input) => {
      const ids = [...specificIds(input.give), ...specificIds(input.get)];
      return new Set(ids).size === ids.length;
    },
    { message: "duplicate_objekt" },
  );
export type CreateOfferInput = z.infer<typeof createOfferInputSchema>;

export const offerIdInputSchema = z.object({ offerId: idSchema });
export const OFFER_VIEWS_LIMIT = 50;
export const offerViewsInputSchema = z.object({
  ids: idSchema.array().min(1).max(OFFER_VIEWS_LIMIT),
});
export const rateInputSchema = z.object({ tradeId: idSchema, rating: z.enum(TRADE_RATINGS) });
export const tradeIdInputSchema = z.object({ tradeId: idSchema });
export const suggestInputSchema = z.object({ partnerId: z.string().min(1) });

const candidateCursorSchema = z.object({ receivedAt: z.string(), id: z.string() });

/** How the offer picker narrows a side. */
const pickerNarrowingSchema = z.object({
  filters: collectionFiltersSchema.partial().optional(),
  /** mine: only what the partner wants; theirs: only what the sender wants */
  matchOnly: z.boolean().optional(),
  /** mine: only collections on this want list of the partner's */
  wantList: z.string().min(1).max(12).optional(),
});
export type PickerNarrowing = z.infer<typeof pickerNarrowingSchema>;

export const candidatesInputSchema = addressedSchema
  .extend({
    side: z.enum(["mine", "theirs"]),
    cursor: candidateCursorSchema.optional(),
    /** theirs: where the next page starts in the resolved list */
    offset: z.number().int().min(0).optional(),
    ...pickerNarrowingSchema.shape,
  })
  .refine(addressed, { message: "conversation_or_target" });

/** The last History row of the previous page, as the server sent it. */
const historyCursorSchema = z.object({
  at: z.string(),
  kind: z.enum(["offer", "trade"]),
  id: z.number().int(),
});
export type HistoryCursor = z.infer<typeof historyCursorSchema>;

export const mineInputSchema = z.object({ cursor: historyCursorSchema.optional() });

/** One objekt the builder may pick; `objektId` null is "any copy". */
const candidateItemSchema = z.object({
  collectionSlug: z.string(),
  objektId: z.string().nullable(),
  serial: z.number().nullable(),
  transferable: z.boolean(),
  /** in an accepted trade still in progress */
  reserved: z.boolean(),
  /** other open offers holding it, the conversation's own excluded */
  inOpenOffer: z.number().array(),
  /** mine: the have list suggesting it; theirs: the list it comes from */
  listSlug: z.string().nullable(),
  /** any copy only: the transferable, unreserved copies held */
  copies: z.number().nullable(),
});
export type CandidateItem = z.infer<typeof candidateItemSchema>;

const progressSchema = z.object({ verified: z.number(), total: z.number() });

const offerItemViewSchema = z.object({
  collectionSlug: z.string(),
  objektId: z.string().nullable(),
  serial: z.number().nullable(),
  listSlug: z.string().nullable(),
});
export type OfferItemView = z.infer<typeof offerItemViewSchema>;

const topupViewSchema = z.object({
  /** decimal string, as `numeric(12,2)` holds it */
  amount: z.string(),
  currency: z.string(),
  payer: z.enum(["you", "them"]),
});
export type TopupView = z.infer<typeof topupViewSchema>;

/** Sides and the top-up's payer are relative to the viewer. */
const offerViewSchema = z.object({
  id: z.number(),
  conversationId: z.number(),
  /** the viewer sent it */
  mine: z.boolean(),
  /** lazy expiry applied */
  status: z.enum(OFFER_STATUSES),
  cancelReason: z.enum(OFFER_CANCEL_REASONS).nullable(),
  give: offerItemViewSchema.array(),
  get: offerItemViewSchema.array(),
  topup: topupViewSchema.nullable(),
  note: z.string().nullable(),
  /** the note's scam-phrase categories, only for the recipient */
  caution: z.enum(FLAG_CATEGORIES).array().nullable(),
  actions: z.enum(OFFER_ACTIONS).array(),
  /** the offer this one counters */
  parentId: z.number().nullable(),
  tradeId: z.number().nullable(),
  tradeStatus: z.enum(TRADE_STATUSES).nullable(),
  /** legs verified of all, once accepted: the card's "n of m transfers verified" */
  tradeProgress: progressSchema.nullable(),
  /** no newer offer exists in the conversation */
  latest: z.boolean(),
  createdAt: z.string(),
  expiresAt: z.string(),
  respondedAt: z.string().nullable(),
});
export type OfferView = z.infer<typeof offerViewSchema>;

const tradeLegViewSchema = z.object({
  id: z.number(),
  collectionSlug: z.string(),
  objektId: z.string().nullable(),
  serial: z.number().nullable(),
  fromYou: z.boolean(),
  open: z.boolean(),
  /** closed: the trade ended before this leg verified */
  state: z.enum(["waiting", "verified", "closed"]),
  verifiedAt: z.string().nullable(),
  txHash: z.string().nullable(),
  verifiedObjektId: z.string().nullable(),
});

const tradeViewSchema = z.object({
  id: z.number(),
  offerId: z.number(),
  conversationId: z.number(),
  partner: chatPartnerSchema.extend({ reputation: reputationSchema.nullable() }),
  status: z.enum(TRADE_STATUSES),
  cancelReason: z.enum(TRADE_CANCEL_REASONS).nullable(),
  cancelledByYou: z.boolean().nullable(),
  proposedAt: z.string(),
  acceptedAt: z.string(),
  endedAt: z.string().nullable(),
  topup: topupViewSchema.nullable(),
  note: z.string().nullable(),
  legs: tradeLegViewSchema.array(),
  progress: progressSchema,
  /** a suggestion only, while in progress; `sent` once every leg that party gives is verified */
  firstSender: z.object({ userId: z.string(), you: z.boolean(), sent: z.boolean() }).nullable(),
  canCancel: z.boolean(),
  /** in progress, but a leg already verified */
  cancelLocked: z.boolean(),
  canReport: z.boolean(),
  /** the viewer's own rating; nobody else's is ever returned */
  rating: z.enum(TRADE_RATINGS).nullable(),
  canRate: z.boolean(),
  rateUntil: z.string().nullable(),
  /** the verifier's last finished run, ISO; null before its first */
  lastCheckedAt: z.string().nullable(),
});
export type TradeView = z.infer<typeof tradeViewSchema>;

/** A My trades row; `kind` says whether `id` is an offer's or a trade's. */
const mineRowSchema = z.object({
  kind: z.enum(["offer", "trade"]),
  id: z.number(),
  offerId: z.number(),
  tradeId: z.number().nullable(),
  conversationId: z.number(),
  partner: chatPartnerSchema,
  status: z.union([z.enum(OFFER_STATUSES), z.enum(TRADE_STATUSES)]),
  cancelReason: z.union([z.enum(OFFER_CANCEL_REASONS), z.enum(TRADE_CANCEL_REASONS)]).nullable(),
  /** an open offer waiting on the viewer */
  yourTurn: z.boolean(),
  give: offerItemViewSchema.array(),
  get: offerItemViewSchema.array(),
  topup: topupViewSchema.nullable(),
  /** what the row is ordered by: when it ended, else when it started */
  at: z.string(),
});
export type MineRow = z.infer<typeof mineRowSchema>;

const OFFER_EVENTS = [
  "received",
  "countered",
  "accepted",
  "declined",
  "withdrawn",
  "cancelled",
  "expired",
] as const;
export type OfferEvent = (typeof OFFER_EVENTS)[number];

/** Data only: the client words it. `reason` is set on `cancelled`; `party` is kept only for rows written before trade notifications existed. */
export const offerPayloadSchema = z.object({
  offerId: z.number(),
  conversationId: z.number(),
  tradeId: z.number().nullable(),
  event: z.enum(OFFER_EVENTS),
  reason: z.enum([...OFFER_CANCEL_REASONS, "party"]).nullable(),
  partner: z.object({ userId: z.string(), name: z.string() }),
});
export type OfferPayload = z.infer<typeof offerPayloadSchema>;

const TRADE_EVENTS = ["leg_verified", "completed", "cancelled", "failed", "reminder"] as const;

/** Data only. `reason` is set on `cancelled`: the other party cancelled, or an objekt left the wallet. */
export const tradePayloadSchema = z.object({
  tradeId: z.number(),
  offerId: z.number(),
  conversationId: z.number(),
  event: z.enum(TRADE_EVENTS),
  reason: z.enum(TRADE_CANCEL_REASONS).nullable(),
  /** legs verified of all legs, when the row was written */
  progress: progressSchema,
  partner: z.object({ userId: z.string(), name: z.string() }),
});
export type TradePayload = z.infer<typeof tradePayloadSchema>;

/** ISO time of the verifier's last finished run. */
export const VERIFIER_LAST_KEY = "trade-verifier:last";
