import * as z from "zod";

import { chatPartnerSchema, chatTargetSchema, FLAG_CATEGORIES } from "./chat";
import { receivedAtCursorSchema, timestampTextSchema } from "./common/cursor";
import { collectionFiltersSchema } from "./common/filters";
import { reputationSchema } from "./reputation";

export const OFFER_SIDE_LIMIT = 200;
export const OFFER_NOTE_MAX_LENGTH = 280;
export const OPEN_OFFER_LIMIT = 20;
export const TOPUP_MAX = 9_999_999_999.99;
export const CANDIDATE_PAGE_SIZE = 200;
export const HISTORY_PAGE_SIZE = 20;
export const REMIND_AFTER_HOURS = 72;
export const REPORT_AFTER_DAYS = 7;
/** A trade still in progress this long after accept ends: failed with a verified leg, else cancelled. */
export const TRADE_EXPIRE_DAYS = 14;
export const RATE_WINDOW_DAYS = 14;
/** After a declined request to cancel, its asker can ask again this long after the decline. */
export const CANCEL_ASK_WAIT_HOURS = 24;
/** A pending wrong copy counts as accepted this long after it was recorded. */
export const COPY_ACCEPT_HOURS = 72;
/** The receiver is reminded this long before a wrong copy counts as accepted. */
export const COPY_REMIND_HOURS = 24;
/** A reserved objekt away from both the giver and the receiver this long breaks its leg. */
export const AWAY_GRACE_HOURS = 72;

/** When a leg whose objekt left at `awayAt` breaks, unless it comes back or is delivered. */
export const awayBreaksAt = (awayAt: string) =>
  new Date(new Date(awayAt).getTime() + AWAY_GRACE_HOURS * 60 * 60 * 1000).toISOString();

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

export const OFFER_CANCEL_REASONS = [
  "reserved",
  "blocked",
  "sanction",
  "token_moved",
  "account_deleted",
  "not_transferable",
] as const;
export type OfferCancelReason = (typeof OFFER_CANCEL_REASONS)[number];

export const TRADE_STATUSES = ["in_progress", "completed", "cancelled", "failed"] as const;
export type TradeStatus = (typeof TRADE_STATUSES)[number];

/** `trade_substitute.status`, as `packages/db` types it */
export const SUBSTITUTE_STATUSES = ["pending", "accepted", "declined"] as const;
export type SubstituteStatus = (typeof SUBSTITUTE_STATUSES)[number];

/** A wrong copy before its receiver: still to decide, or turned down. An accepted one verified its leg. */
export const HELD_COPY_STATUSES = ["pending", "declined"] as const satisfies SubstituteStatus[];
export type HeldCopyStatus = (typeof HELD_COPY_STATUSES)[number];

/** Set on a cancelled trade; `expired` also on a failed one. `agreed`: both parties agreed to cancel. */
export const TRADE_CANCEL_REASONS = [
  "party",
  "token_moved",
  "expired",
  "not_transferable",
  "agreed",
] as const;
export type TradeCancelReason = (typeof TRADE_CANCEL_REASONS)[number];

/** `trade_cancel_request.status`, as `packages/db` types it. */
export const CANCEL_REQUEST_STATUSES = ["pending", "accepted", "declined", "withdrawn"] as const;
export type CancelRequestStatus = (typeof CANCEL_REQUEST_STATUSES)[number];

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
  "indexer_behind",
  "not_receiver",
  "substitute_closed",
  "substitute_taken",
  "leg_closed",
  "copy_pending",
  "confirmed_trade",
  "not_completed",
  "rating_closed",
  "no_address",
  "links_changed",
  "cancel_asked",
  "cancel_wait",
  "no_cancel_request",
  "self",
  "not_accepting",
  "message_limit",
  "muted",
  "offer_changed",
  "not_wanted",
  "other_post",
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

/**
 * `OFFER_SIDE_LIMIT` is checked by `validateShape`, so it comes back as a refusal, not a
 * validation error; the schema's own cap only bounds the request.
 */
export const createOfferInputSchema = addressedSchema
  .extend({
    give: giveItemInputSchema.array().max(OFFER_SIDE_LIMIT * 10),
    get: getItemInputSchema.array().max(OFFER_SIDE_LIMIT * 10),
    /** the offer a counter answers, as its sender saw it */
    counters: idSchema.optional(),
    /** the partner's post (a have or sale list) the builder started on; never narrows asks alone */
    post: z.string().min(1).max(12).optional(),
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
export type GetItemInput = z.infer<typeof getItemInputSchema>;

export const offerIdInputSchema = z.object({ offerId: idSchema });
export const OFFER_VIEWS_LIMIT = 50;
export const offerViewsInputSchema = z.object({
  ids: idSchema.array().min(1).max(OFFER_VIEWS_LIMIT),
});
export const rateInputSchema = z.object({ tradeId: idSchema, rating: z.enum(TRADE_RATINGS) });
export const tradeIdInputSchema = z.object({ tradeId: idSchema });
export const substituteIdInputSchema = z.object({ substituteId: idSchema });
export const legIdInputSchema = z.object({ legId: idSchema });
export const answerCancelInputSchema = z.object({ tradeId: idSchema, accept: z.boolean() });
/** `list`, `mutual` and `post` are optional, so a tab that sends `{ partnerId }` alone still validates. */
export const suggestInputSchema = z.object({
  partnerId: z.string().min(1),
  /** Compare with: one of the viewer's lists, as the Trade row counted with it */
  list: z.string().min(1).optional(),
  mutual: z.boolean().optional(),
  /** one of the partner's lists: only that post's matches */
  post: z.string().min(1).optional(),
  /** the row's lead post, which wins a tie under Only asks from one post */
  lead: z.string().min(1).optional(),
});

export type CandidateCursor = z.infer<typeof receivedAtCursorSchema>;

/** How the offer picker narrows a side. */
const pickerNarrowingSchema = z.object({
  filters: collectionFiltersSchema.partial().optional(),
  /** mine: only what the partner wants; theirs: only what the sender wants */
  matchOnly: z.boolean().optional(),
  /** mine: only collections on this want list of the partner's */
  wantList: z.string().min(1).max(12).optional(),
  /** mine: only what one of the sender's own have, sale or general lists names; theirs: only one of the partner's have or sale lists on Trade */
  fromList: z.string().min(1).max(12).optional(),
  /** mine: only these objekts, for the flags a counter's give picks come without */
  objektIds: z.array(objektIdSchema).min(1).max(OFFER_SIDE_LIMIT).optional(),
  /** mine: every copy of these collections, unpaged, for a counter's any-copy asks */
  copiesOf: z.array(slugSchema).min(1).max(OFFER_SIDE_LIMIT).optional(),
});
export type PickerNarrowing = z.infer<typeof pickerNarrowingSchema>;

export const candidatesInputSchema = addressedSchema
  .extend({
    side: z.enum(["mine", "theirs", "theirs-collection"]),
    /** mine and theirs-collection: where the next page starts */
    cursor: receivedAtCursorSchema.optional(),
    /** theirs: where the next page starts in the resolved list */
    offset: z.number().int().min(0).optional(),
    ...pickerNarrowingSchema.shape,
  })
  .refine(addressed, { message: "conversation_or_target" });

/** The last History row of the previous page, as the server sent it. */
const historyCursorSchema = z.object({
  at: timestampTextSchema,
  kind: z.enum(["offer", "trade"]),
  id: z.int32(),
});
export type HistoryCursor = z.infer<typeof historyCursorSchema>;

export const mineInputSchema = z.object({ cursor: historyCursorSchema.optional() });

/** One objekt the builder may pick; `objektId` null is "any copy". */
const candidateItemSchema = z.object({
  collectionSlug: z.string(),
  objektId: z.string().nullable(),
  serial: z.number().nullable(),
  /** minted after Cosmo stopped supplying serials: `serial` is our estimate */
  serialEstimated: z.boolean(),
  transferable: z.boolean(),
  /** in an accepted trade still in progress */
  reserved: z.boolean(),
  /** the viewer's other open offers holding it, the conversation's own excluded */
  inOpenOffer: z.number().array(),
  /** mine: the have list suggesting it; theirs: the list it comes from */
  listSlug: z.string().nullable(),
  /** any copy only: the transferable, unreserved copies held */
  copies: z.number().nullable(),
  /** any copy only: an entry names the whole collection on a list that shows serials */
  bySerial: z.boolean(),
  /** any copy only: of `copies`, those no serial in this read stands for, which only Any serial reaches */
  hidden: z.number().int().optional(),
  /** theirs from a have list: the trade ratio its entry asks (the entry's, else the list's); shown, never checked */
  ratio: z.number().int().optional(),
});
export type CandidateItem = z.infer<typeof candidateItemSchema>;

/**
 * An any copy the partner listed as one (whole collection or hidden serials), not one over shown
 * copies. A server from before `hidden` never emitted the latter, so a missing `hidden` is listed.
 */
export const listedAsAny = (item: CandidateItem) =>
  item.objektId === null && (item.bySerial || (item.hidden ?? 1) > 0);

/** One of the partner's have or sale lists on Trade: a post the offer can be on. */
export type PartnerList = {
  slug: string;
  name: string;
  type: "have" | "sale";
  /** the post's own want list on Trade, which Only offers with what I want checks gives against */
  want: string | null;
};

const progressSchema = z.object({ verified: z.number(), total: z.number() });
export type Progress = z.infer<typeof progressSchema>;

const offerItemViewSchema = z.object({
  collectionSlug: z.string(),
  objektId: z.string().nullable(),
  serial: z.number().nullable(),
  serialEstimated: z.boolean(),
  listSlug: z.string().nullable(),
  /** the giver already sent it to the other party, while the offer is open */
  sentAt: z.string().nullable(),
  /** recipient only: a give on none of their want lists */
  notWanted: z.boolean().default(false),
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
  /** the partner's post the offer is on, shown to both people */
  post: z.object({ slug: z.string(), name: z.string() }).nullable().default(null),
  /** recipient only: a decline may offer Only offers with what I want */
  suggestWantedOnly: z.boolean().optional(),
  /** recipient only: the posts an offer on no post asks from, when two or more */
  askPosts: z.object({ slug: z.string(), name: z.string() }).array().optional(),
  /** recipient only: a decline may offer to turn Let people ask from more than one post off */
  suggestOnePost: z.boolean().optional(),
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
  serialEstimated: z.boolean(),
  fromYou: z.boolean(),
  open: z.boolean(),
  /** closed: the trade ended before this leg verified */
  state: z.enum(["waiting", "verified", "closed"]),
  /** waiting, but the indexer reads the objekt as non-transferable */
  stuck: z.boolean(),
  /** waiting while the objekt is away from the giver: when it left, and when the leg breaks */
  away: z.object({ at: z.string(), breaksAt: z.string() }).nullable(),
  /**
   * on the viewer's own open legs naming an objekt, while the viewer has two or more profiles: the
   * profile holding it now; optional so payloads from before the field still validate
   */
  heldBy: z.object({ address: z.string(), name: z.string() }).nullable().optional(),
  verifiedAt: z.string().nullable(),
  /** the receiver marked it as received by hand: `verifiedAt` is set and there is no `txHash` */
  confirmedAt: z.string().nullable().default(null),
  txHash: z.string().nullable(),
  verifiedObjektId: z.string().nullable(),
  /** set when the leg verified with another objekt than it asked for */
  verifiedSerial: z.number().nullable(),
  verifiedSerialEstimated: z.boolean(),
  /** wrong copies before the receiver, while the leg waits */
  substitutes: z
    .object({
      id: z.number(),
      objektId: z.string(),
      serial: z.number().nullable(),
      serialEstimated: z.boolean(),
      txHash: z.string(),
      at: z.string(),
      status: z.enum(HELD_COPY_STATUSES),
      /**
       * ISO time this copy counts as accepted, on its leg's earliest pending copy only; optional
       * so payloads from before the field still validate
       */
      acceptBy: z.string().nullable().optional(),
    })
    .array(),
  /** verified through a wrong copy accepted automatically */
  autoAccepted: z.boolean().optional(),
  /**
   * on a verified leg the viewer received: their want lists that still hold the collection as a
   * hand-added entry and do not remove what a trade delivers
   */
  wantedOn: z.object({ slug: z.string(), name: z.string() }).array().optional(),
});

/** A request to cancel, as the viewer sees it; `lapsed`: still pending when the trade ended another way. */
const cancelRequestViewSchema = z.object({
  byYou: z.boolean(),
  at: z.string(),
  status: z.enum([...CANCEL_REQUEST_STATUSES, "lapsed"]),
  answeredAt: z.string().nullable(),
});
export type CancelRequestView = z.infer<typeof cancelRequestViewSchema>;

export const tradeViewSchema = z.object({
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
  /** in progress, but a leg already verified or a wrong copy is held */
  cancelLocked: z.boolean(),
  /** ISO time of the newest block the indexer has read; transfers after it aren't seen yet */
  seenUntil: z.string().nullable(),
  /** the indexer's reading is too old to trust (see `isBehind`) */
  indexerBehind: z.boolean(),
  canReport: z.boolean(),
  /** the viewer's own rating; nobody else's is ever returned */
  rating: z.enum(TRADE_RATINGS).nullable(),
  canRate: z.boolean(),
  rateUntil: z.string().nullable(),
  /** the verifier's last finished run, ISO; null before its first */
  lastCheckedAt: z.string().nullable(),
  /** every request to cancel, oldest first; defaults keep payloads from before them valid */
  cancelRequests: cancelRequestViewSchema.array().default([]),
  /** the open request, only while the trade is in progress */
  cancelRequest: z.object({ byYou: z.boolean(), at: z.string() }).nullable().default(null),
  /** ISO time the viewer may ask again after a decline, while that is still ahead */
  cancelAskOpensAt: z.string().nullable().default(null),
});
export type TradeView = z.infer<typeof tradeViewSchema>;

const mineRowBase = {
  id: z.number(),
  offerId: z.number(),
  tradeId: z.number().nullable(),
  conversationId: z.number(),
  partner: chatPartnerSchema,
  /** an open offer waiting on the viewer */
  yourTurn: z.boolean(),
  give: offerItemViewSchema.array(),
  get: offerItemViewSchema.array(),
  topup: topupViewSchema.nullable(),
  /** a trade's verified legs; null on an offer */
  progress: progressSchema.nullable(),
  /** what the row is ordered by: when it ended, else when it started */
  at: z.string(),
};

/** A My trades row; `kind` says whether `id` is an offer's or a trade's, and so which statuses apply. */
const mineRowSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("offer"),
    ...mineRowBase,
    status: z.enum(OFFER_STATUSES),
    cancelReason: z.enum(OFFER_CANCEL_REASONS).nullable(),
  }),
  z.object({
    kind: z.literal("trade"),
    ...mineRowBase,
    status: z.enum(TRADE_STATUSES),
    cancelReason: z.enum(TRADE_CANCEL_REASONS).nullable(),
  }),
]);
export type MineRow = z.infer<typeof mineRowSchema>;

export const NOTE_OBJEKTS = 3;

/**
 * The offer's collections as the reader sees them: what they get first, then what they give,
 * each once, three at most. `side` is the offer creator's: the creator gets the `get` side, the
 * other party the `give` side. `items` come in the offer's own order.
 */
export function noteObjekts(
  items: readonly { side: OfferSide; collectionSlug: string }[],
  readerId: string,
  fromUserId: string,
): string[] {
  const gets: OfferSide = readerId === fromUserId ? "get" : "give";
  const slugsOf = (side: OfferSide) =>
    items.filter((item) => item.side === side).map((item) => item.collectionSlug);
  const other: OfferSide = gets === "get" ? "give" : "get";
  return [...new Set([...slugsOf(gets), ...slugsOf(other)])].slice(0, NOTE_OBJEKTS);
}

const OFFER_EVENTS = [
  "received",
  "countered",
  "accepted",
  "declined",
  "withdrawn",
  "cancelled",
  "expired",
] as const;

/** `image` is never stored: the list read fills it from the partner's account as it is now. */
const notePartnerSchema = z.object({
  userId: z.string(),
  name: z.string(),
  image: z.string().nullable().optional(),
});

/** Data only: the client words it. `reason` is set on `cancelled`; `party` is kept only for rows written before trade notifications existed. */
export const offerPayloadSchema = z.object({
  offerId: z.number(),
  conversationId: z.number(),
  tradeId: z.number().nullable(),
  event: z.enum(OFFER_EVENTS),
  reason: z.enum([...OFFER_CANCEL_REASONS, "party"]).nullable(),
  partner: notePartnerSchema,
  /** up to three collections of the offer, what the reader gets first; absent on rows written before it existed */
  objekts: z.string().array().max(NOTE_OBJEKTS).optional(),
});
export type OfferPayload = z.infer<typeof offerPayloadSchema>;

const TRADE_EVENTS = [
  "leg_verified",
  "completed",
  "cancelled",
  "failed",
  "reminder",
  "wrong_copy",
  "wrong_copy_declined",
  "stuck",
  "wrong_copy_due",
  "wrong_copy_auto_accepted",
  "away",
  "leg_confirmed",
  "cancel_asked",
  "cancel_declined",
] as const;

/** A serial as trade surfaces show it: null before it's numbered, `estimated` after Cosmo's cutoff. */
const shownSerialSchema = z.object({ serial: z.number().nullable(), estimated: z.boolean() });
export type ShownSerial = z.infer<typeof shownSerialSchema>;

/**
 * Data only. `reason` is set on `cancelled`: the other party cancelled, an objekt left the wallet
 * or can no longer be transferred, or the trade expired; and on `failed` when it expired. `copy` is set on the wrong-copy events.
 */
export const tradePayloadSchema = z.object({
  tradeId: z.number(),
  offerId: z.number(),
  conversationId: z.number(),
  event: z.enum(TRADE_EVENTS),
  reason: z.enum(TRADE_CANCEL_REASONS).nullable(),
  /** legs verified of all legs, when the row was written */
  progress: progressSchema,
  partner: notePartnerSchema,
  copy: z.object({ asked: shownSerialSchema, sent: shownSerialSchema }).optional(),
  /** ISO time the copy counts as accepted, on `wrong_copy` and `wrong_copy_due` */
  acceptBy: z.string().optional(),
  /** ISO time the trade breaks unless the objekt is back or delivered, on `away` */
  breaksAt: z.string().optional(),
  /** on `away`: the objekt that left, and whether the reader is the one who owes it */
  away: z.object({ asked: shownSerialSchema, byYou: z.boolean() }).optional(),
  /** as on an offer note: up to three collections, what the reader gets first */
  objekts: z.string().array().max(NOTE_OBJEKTS).optional(),
  /** on `completed`: a leg was confirmed by hand, so the trade takes no feedback */
  confirmed: z.boolean().optional(),
});
export type TradePayload = z.infer<typeof tradePayloadSchema>;

/** ISO time of the verifier's last finished run. */
export const VERIFIER_LAST_KEY = "trade-verifier:last";

/** Valkey channel an accept publishes on, so the verifier watches the new legs at once. */
export const VERIFIER_NUDGE_CHANNEL = "trade-verifier:nudge";

/** How far the indexer has read: the newest recorded block's time, and when the worker read it. */
export const indexerSeenSchema = z.object({ seenUntil: z.string(), readAt: z.string() });
export type IndexerSeen = z.infer<typeof indexerSeenSchema>;
export const INDEXER_SEEN_KEY = "trade-verifier:seen";
