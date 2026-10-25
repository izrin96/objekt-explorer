import * as z from "zod";

import { addressSchema } from "./common/address";
import type { OfferView } from "./offer";
import { publicUserSchema } from "./profile";
import { POST_TYPES } from "./trade";

export const MESSAGE_MAX_LENGTH = 2000;
export const THREAD_PAGE_SIZE = 50;
export const CONVERSATION_PAGE_SIZE = 30;

export const START_LIMIT = 20;
export const NEW_ACCOUNT_START_LIMIT = 5;
export const NEW_ACCOUNT_DAYS = 7;
export const START_WINDOW_HOURS = 24;
export const MESSAGE_LIMIT_PER_MINUTE = 30;

export const MATCH_SLUGS = 3;

export const MUTE_HOURS = { "8h": 8, "1w": 7 * 24 } as const;

export const MESSAGE_ALLOW = ["anyone", "nobody"] as const;
export type MessageAllow = (typeof MESSAGE_ALLOW)[number];

/** A user with no `message_pref` row uses these. */
export const MESSAGE_PREF_DEFAULTS = { allow: "anyone" } as const;

/** `data.reason` on a refused start or send. */
export const CHAT_REFUSALS = [
  "no_address",
  "self",
  "not_accepting",
  "start_limit",
  "message_limit",
  "invalid_card",
  "muted",
  "unsend_closed",
  "settings_limit",
] as const;
export type ChatRefusal = (typeof CHAT_REFUSALS)[number];

export const FLAG_CATEGORIES = ["send_first", "outside_payment"] as const;
export type FlagCategory = (typeof FLAG_CATEGORIES)[number];

/** Stored categories this server knows, or null when none are left. */
export function parseCaution(value: string[] | null): FlagCategory[] | null {
  const categories = (value ?? []).filter((c): c is FlagCategory =>
    (FLAG_CATEGORIES as readonly string[]).includes(c),
  );
  return categories.length > 0 ? categories : null;
}

export const CHAT_BOXES = ["inbox", "requests", "archived"] as const;
export type ChatBox = (typeof CHAT_BOXES)[number];

/** Code points, as Postgres `char_length` counts them. */
export const messageLength = (body: string) => Array.from(body).length;

/** Format characters, Braille blank, Hangul fillers and whitespace render as nothing. */
const BLANK_RENDERING = /[\p{Cf}\u2800\u3164\u115F\u1160\uFFA0\s]/gu;

export const messageBodySchema = z
  .string()
  .trim()
  .min(1)
  .refine((body) => !body.includes("\0"), { message: "empty" })
  .refine((body) => body.replace(BLANK_RENDERING, "") !== "", { message: "empty" })
  .refine((body) => messageLength(body) <= MESSAGE_MAX_LENGTH, { message: "too_long" });

const slugSchema = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .refine((slug) => !slug.includes("\0"));

/** An objekt card as `message.card` stores it; search reads `card->>'collectionSlug'`. */
export const storedObjektCardSchema = z.object({
  kind: z.literal("objekt"),
  collectionSlug: z.string(),
  objektId: z.string().optional(),
  listId: z.number().int().optional(),
});
export type StoredObjektCard = z.infer<typeof storedObjektCardSchema>;
/** What a card view is read from: a stored objekt card, or an offer or trade item drawn as one. */
export type CardRef = Omit<StoredObjektCard, "kind">;

/** One direction of a saved match: the count of collections, and the first three by slug. */
const matchSideSchema = z.object({
  count: z.number().int().nonnegative(),
  slugs: z.string().array().max(MATCH_SLUGS),
});

/** The overlap saved when a post card is sent; `ownerHas` is the owner's objekts on the sender's wants. */
export const storedMatchSchema = z.object({
  ownerHas: matchSideSchema,
  senderHas: matchSideSchema,
});
export type StoredMatch = z.infer<typeof storedMatchSchema>;

const storedPostCardSchema = z.object({
  kind: z.literal("post"),
  listId: z.number().int(),
  match: storedMatchSchema.optional(),
});
export type StoredPostCard = z.infer<typeof storedPostCardSchema>;

/** What `message.card` can hold. */
export const storedCardSchema = z.discriminatedUnion("kind", [
  storedPostCardSchema,
  storedObjektCardSchema,
]);
export type StoredCard = z.infer<typeof storedCardSchema>;

export const isPostCard = (card: StoredCard): card is StoredPostCard => card.kind === "post";

/** A stored card as its two kinds. */
export function cardKinds(card: StoredCard | null) {
  if (card === null) return { objekt: null, post: null };
  return isPostCard(card) ? { objekt: null, post: card } : { objekt: card, post: null };
}

export function splitCards(cards: (StoredCard | null)[]) {
  const kinds = cards.map(cardKinds);
  return {
    objekts: kinds.flatMap((kind) => (kind.objekt ? [kind.objekt] : [])),
    posts: kinds.flatMap((kind) => (kind.post ? [kind.post] : [])),
  };
}

const objektCardInputSchema = z.object({
  kind: z.literal("objekt"),
  collectionSlug: slugSchema(255),
  objektId: slugSchema(255).optional(),
  listSlug: slugSchema(12).optional(),
});
export type ObjektCardInput = z.infer<typeof objektCardInputSchema>;

const postCardInputSchema = z.object({
  kind: z.literal("post"),
  listSlug: slugSchema(12),
  withMatch: z.boolean().optional(),
});
export type PostCardInput = z.infer<typeof postCardInputSchema>;

/** A card as the client sends it; the list is named by slug and stored by id. */
const cardInputSchema = z.discriminatedUnion("kind", [postCardInputSchema, objektCardInputSchema]);
export type CardInput = z.infer<typeof cardInputSchema>;

export const isPostInput = (input: CardInput): input is PostCardInput => input.kind === "post";

export const chatTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list"), slug: slugSchema(12) }),
  z.object({ kind: z.literal("profile"), address: addressSchema }),
  z.object({ kind: z.literal("user"), userId: z.string().min(1) }),
]);
export type ChatTarget = z.infer<typeof chatTargetSchema>;

const idSchema = z.number().int().positive();

export const startInputSchema = z.object({
  to: chatTargetSchema,
  card: cardInputSchema.optional(),
});

/** How often the message box says the user is typing, and how long the other side shows it. */
export const TYPING_PING_MS = 3000;
export const TYPING_SHOWN_MS = 6000;
/** Shorter than the ping interval, so each ping gets through and a flood does not. */
export const TYPING_GUARD_MS = TYPING_PING_MS - 1000;

/** How long after sending a message its sender may unsend it. */
export const UNSEND_WINDOW_MINUTES = 15;

export const unsendInputSchema = z.object({ messageId: z.number().int().positive() });

export const sendInputSchema = z
  .object({
    conversationId: idSchema,
    body: messageBodySchema.optional(),
    card: cardInputSchema.optional(),
    /** one per composed message, so a retry after an unknown outcome never posts twice */
    clientId: z.uuid(),
  })
  .refine((input) => input.body !== undefined || input.card !== undefined, {
    message: "empty",
  });

/** The last row of the previous page; `at` is its last activity (`last_message_at`, else `created_at`) exactly as the database wrote it. */
const conversationCursorSchema = z.object({
  at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:[+-]\d{2}(?::\d{2})?)?$/),
  id: z.number().int(),
});
export type ConversationCursor = z.infer<typeof conversationCursorSchema>;

export const SEARCH_MAX_LENGTH = 50;

export const listConversationsInputSchema = z.object({
  box: z.enum(CHAT_BOXES).default("inbox"),
  q: z.string().trim().min(1).max(SEARCH_MAX_LENGTH).optional(),
  cursor: conversationCursorSchema.optional(),
});

export const threadInputSchema = z.object({
  id: idSchema,
  before: idSchema.optional(),
  after: z.number().int().nonnegative().optional(),
});

export const conversationIdInputSchema = z.object({ id: idSchema });

export const markReadInputSchema = z.object({
  id: idSchema,
  /** the newest message the client has shown; the conversation's latest when absent */
  upTo: idSchema.optional(),
});

export const muteInputSchema = z.object({
  id: idSchema,
  /** null unmutes */
  until: z.enum(["8h", "1w", "always"]).nullable(),
});

const messageSettingsSchema = z.object({
  allow: z.enum(MESSAGE_ALLOW),
  /** Seen and typing, both ways: off hides the account's and shows it no one's */
  showActivity: z.boolean(),
});
export type MessageSettings = z.infer<typeof messageSettingsSchema>;

export const setSettingsInputSchema = messageSettingsSchema.partial();

const partnerIdentitySchema = z.object({
  name: z.string(),
  address: z.string().nullable(),
  nickname: z.string().nullable(),
  also: z.object({ address: z.string(), nickname: z.string().nullable() }).array(),
});

export const chatPartnerSchema = z.object({
  userId: z.string(),
  user: publicUserSchema,
  identity: partnerIdentitySchema,
});

/** A card as the thread draws it, read live: a deleted list or entry drops out, not the card. */
const cardViewSchema = z.object({
  kind: z.literal("objekt"),
  collectionSlug: z.string(),
  objektId: z.string().nullable(),
  serial: z.number().nullable(),
  list: z
    .object({
      id: z.number(),
      slug: z.string(),
      name: z.string(),
      listType: z.enum(["general", "sale", "have", "want"]),
      currency: z.string().nullable(),
      profileSlug: z.string().nullable(),
      profile: z.object({ address: z.string(), nickname: z.string().nullable() }).nullable(),
    })
    .nullable(),
  /** set only for a sale list holding the card's objekt or collection */
  price: z.number().nullable(),
  isQyop: z.boolean(),
});
export type CardView = z.infer<typeof cardViewSchema>;

const postSideViewSchema = z.object({
  /** up to six collections of the side, newest first */
  slugs: z.string().array(),
  /** collections past `slugs` */
  more: z.number(),
  /** every entry of the side, as Browse counts it */
  copyCount: z.number(),
});

const postTagSchema = z.enum(POST_TYPES).exclude(["all"]);

/** A Trade post as the thread draws it, read live; `post` is null once the post is gone. */
export const postCardViewSchema = z.object({
  kind: z.literal("post"),
  listId: z.number(),
  post: z
    .object({
      /** the one tag that picks the suggested opening message */
      tag: postTagSchema,
      /** every tag the post lists under on Browse, as its badges */
      tags: postTagSchema.array(),
      owner: z.object({ userId: z.string(), name: z.string() }),
      /** the post's own list, which the card links to */
      list: z.object({
        id: z.number(),
        slug: z.string(),
        name: z.string(),
        profileSlug: z.string().nullable(),
        profile: z.object({ address: z.string(), nickname: z.string().nullable() }).nullable(),
      }),
      /** the have or sale list's side; null for a want-only post */
      has: postSideViewSchema.nullable(),
      wants: postSideViewSchema.nullable(),
      /** a sale post with no want list: the range of its non-QYOP prices */
      price: z.object({ min: z.number(), max: z.number(), currency: z.string() }).nullable(),
    })
    .nullable(),
  /** what was saved when the card was sent; shown even when the post is gone */
  match: storedMatchSchema.nullable(),
});
export type PostCardView = z.infer<typeof postCardViewSchema>;

const chatCardViewSchema = z.discriminatedUnion("kind", [cardViewSchema, postCardViewSchema]);
export type ChatCardView = z.infer<typeof chatCardViewSchema>;

export const chatMessageSchema = z.object({
  id: z.number(),
  mine: z.boolean(),
  body: z.string().nullable(),
  card: chatCardViewSchema.nullable(),
  createdAt: z.string(),
  /** scam-phrase categories, only on messages the viewer received */
  caution: z.enum(FLAG_CATEGORIES).array().nullable(),
  /** removed by its sender: no body or card is sent */
  unsent: z.boolean(),
});
/** `offer` is set on an offer message, and null on others; it lives in `./offer`, which imports this file. */
export type ChatMessage = z.infer<typeof chatMessageSchema> & { offer?: OfferView | null };

/** What an unsent message keeps in chat: its place, side and time, never its text or card. */
export function unsentMessage(message: Pick<ChatMessage, "id" | "mine" | "createdAt">) {
  return {
    id: message.id,
    mine: message.mine,
    createdAt: message.createdAt,
    body: null,
    card: null,
    caution: null,
    unsent: true,
    offer: null,
  } satisfies ChatMessage;
}

/** `until` is null for "always". */
const muteStateSchema = z.object({ until: z.string().nullable() }).nullable();

export const conversationRowSchema = z.object({
  id: z.number(),
  partner: chatPartnerSchema,
  last: z.object({
    id: z.number(),
    mine: z.boolean(),
    body: z.string().nullable(),
    /** the kind of card the last message carries */
    card: z.enum(["objekt", "post"]).nullable(),
    offerId: z.number().nullable(),
    createdAt: z.string(),
    unsent: z.boolean(),
  }),
  /** the conversation's newest card */
  context: chatCardViewSchema.nullable(),
  unread: z.boolean(),
  request: z.boolean(),
  archived: z.boolean(),
  muted: muteStateSchema,
});
export type ConversationRow = z.infer<typeof conversationRowSchema>;
