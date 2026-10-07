import * as z from "zod";

import { addressSchema } from "./common/address";
import type { OfferView } from "./offer";
import { publicUserSchema } from "./profile";

export const MESSAGE_MAX_LENGTH = 2000;
export const THREAD_PAGE_SIZE = 50;
export const CONVERSATION_PAGE_SIZE = 30;

export const START_LIMIT = 20;
export const NEW_ACCOUNT_START_LIMIT = 5;
export const NEW_ACCOUNT_DAYS = 7;
export const START_WINDOW_HOURS = 24;
export const MESSAGE_LIMIT_PER_MINUTE = 30;

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

const messageBodySchema = z
  .string()
  .trim()
  .min(1)
  .refine((body) => messageLength(body) <= MESSAGE_MAX_LENGTH, { message: "too_long" });

/** What `message.card` stores. */
export const storedCardSchema = z.object({
  collectionSlug: z.string(),
  objektId: z.string().optional(),
  listId: z.number().int().optional(),
});
export type StoredCard = z.infer<typeof storedCardSchema>;

/** A card as the client sends it; the list is named by slug and stored by id. */
const cardInputSchema = z.object({
  collectionSlug: z.string().min(1).max(255),
  objektId: z.string().min(1).max(255).optional(),
  listSlug: z.string().min(1).max(12).optional(),
});
export type CardInput = z.infer<typeof cardInputSchema>;

export const chatTargetSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list"), slug: z.string().min(1).max(12) }),
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

/** How long after sending a message its sender may unsend it. */
export const UNSEND_WINDOW_MINUTES = 15;

export const unsendInputSchema = z.object({ messageId: z.number().int().positive() });

export const sendInputSchema = z
  .object({
    conversationId: idSchema,
    body: messageBodySchema.optional(),
    card: cardInputSchema.optional(),
  })
  .refine((input) => input.body !== undefined || input.card !== undefined, {
    message: "empty",
  });

/** The last row of the previous page; `at` is its last activity (`last_message_at`, else `created_at`) exactly as the database wrote it. */
const conversationCursorSchema = z.object({ at: z.string(), id: z.number().int() });
export type ConversationCursor = z.infer<typeof conversationCursorSchema>;

export const listConversationsInputSchema = z.object({
  box: z.enum(CHAT_BOXES).default("inbox"),
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
  /** the linked address that names the account in chat; null is the first linked */
  chatAs: addressSchema.nullable(),
  /** Seen and typing, both ways: off hides the account's and shows it no one's */
  showActivity: z.boolean(),
});
export type MessageSettings = z.infer<typeof messageSettingsSchema>;

export const setSettingsInputSchema = messageSettingsSchema.partial();

const partnerIdentitySchema = z.object({
  name: z.string(),
  address: z.string().nullable(),
  also: z.object({ address: z.string(), nickname: z.string().nullable() }).array(),
});

export const chatPartnerSchema = z.object({
  userId: z.string(),
  user: publicUserSchema,
  identity: partnerIdentitySchema,
});

/** A card as the thread draws it, read live: a deleted list or entry drops out, not the card. */
const cardViewSchema = z.object({
  collectionSlug: z.string(),
  objektId: z.string().nullable(),
  serial: z.number().nullable(),
  list: z
    .object({
      id: z.number(),
      slug: z.string(),
      name: z.string(),
      listTypeNew: z.enum(["general", "sale", "have", "want"]),
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

const chatMessageSchema = z.object({
  id: z.number(),
  mine: z.boolean(),
  body: z.string().nullable(),
  card: cardViewSchema.nullable(),
  createdAt: z.string(),
  /** scam-phrase categories, only on messages the viewer received */
  caution: z.enum(FLAG_CATEGORIES).array().nullable(),
  /** removed by its sender: no body or card is sent */
  unsent: z.boolean(),
});
/** `offer` is set on an offer message, and null on others; it lives in `./offer`, which imports this file. */
export type ChatMessage = z.infer<typeof chatMessageSchema> & { offer?: OfferView | null };

/** `until` is null for "always". */
const muteStateSchema = z.object({ until: z.string().nullable() }).nullable();

const conversationRowSchema = z.object({
  id: z.number(),
  partner: chatPartnerSchema,
  last: z
    .object({
      id: z.number(),
      mine: z.boolean(),
      body: z.string().nullable(),
      card: storedCardSchema.nullable(),
      offerId: z.number().nullable(),
      createdAt: z.string(),
      unsent: z.boolean(),
    })
    /** null only on the starter's row of a conversation with no message yet */
    .nullable(),
  unread: z.boolean(),
  request: z.boolean(),
  archived: z.boolean(),
  muted: muteStateSchema,
});
export type ConversationRow = z.infer<typeof conversationRowSchema>;
