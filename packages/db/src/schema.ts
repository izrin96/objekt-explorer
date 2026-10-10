import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { account, session, user, verification } from "./auth-schema";
import { citext } from "./custom-type";

export { user, session, account, verification };

export const listTypeEnum = pgEnum("list_type_new", ["general", "sale", "have", "want"]);

export const accessToken = pgTable("access_token", {
  id: serial("id").primaryKey(),
  accessToken: varchar("access_token").notNull(),
  refreshToken: varchar("refresh_token").notNull(),
});

export const userAddress = pgTable(
  "user_address",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    nickname: citext("nickname", { length: 24 }),
    userId: text("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    linkedAt: timestamp("linked_at", { mode: "string", withTimezone: true }),
    bannerImgUrl: text("banner_img_url"),
    bannerImgType: text("banner_img_type"),
    privateProfile: boolean("private_profile").notNull().default(false),
    privateSerial: boolean("private_serial").notNull().default(false),
    hideTransfer: boolean("hide_transfer").notNull().default(false),
    hideNickname: boolean("hide_nickname").notNull().default(false),
    isAbstract: boolean("is_abstract").notNull().default(false),
    gridColumns: integer("grid_columns"),
    cosmoId: integer("cosmo_id"),
    lastCosmoCheck: timestamp("last_cosmo_check", { mode: "string", withTimezone: true }),
    bannerUpdatedAt: timestamp("banner_updated_at", { mode: "string", withTimezone: true }),
  },
  (t) => [
    uniqueIndex("user_address_address_idx").on(t.address),
    index("user_address_nickname_idx").on(t.nickname),
    uniqueIndex("user_address_address_nickname_idx").on(t.address, t.nickname),
    index("user_address_user_id_idx").on(t.userId),
  ],
);

export const lists = pgTable(
  "lists",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),
    slug: varchar("slug", { length: 12 }).notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
    gridColumns: integer("grid_columns"),
    listTypeNew: listTypeEnum("list_type_new").notNull().default("general"),
    isProfileBind: boolean("is_profile_bind").notNull().default(false),
    hideSerial: boolean("hide_serial").notNull().default(false),
    linkedListId: integer("linked_list_id").references((): AnyPgColumn => lists.id, {
      onDelete: "set null",
    }),
    profileAddress: citext("profile_address", { length: 42 }),
    profileSlug: varchar("profile_slug", { length: 100 }),
    description: text("description"),
    currency: varchar("currency", { length: 10 }),
    discoverable: boolean("discoverable").notNull().default(false),
    updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
    bumpedAt: timestamp("bumped_at", { mode: "string", withTimezone: true }),
  },
  (t) => [
    uniqueIndex("lists_slug_idx").on(t.slug),
    index("lists_user_id_idx").on(t.userId),
    uniqueIndex("lists_profile_slug_idx")
      .on(t.profileAddress, t.profileSlug)
      .where(sql`profile_address IS NOT NULL AND profile_slug IS NOT NULL`),
    index("lists_profile_address_idx")
      .on(t.profileAddress)
      .where(sql`profile_address IS NOT NULL`),
    index("lists_linked_list_id_idx")
      .on(t.linkedListId)
      .where(sql`linked_list_id IS NOT NULL`),
    index("lists_trade_discoverable_idx")
      .on(t.listTypeNew)
      .where(sql`list_type_new IN ('have', 'want') AND discoverable = true`),
    index("lists_trade_feed_idx")
      .on(t.bumpedAt.desc(), t.id)
      .where(sql`discoverable`),
  ],
);

export const listEntries = pgTable(
  "list_entries",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id")
      .notNull()
      .references(() => lists.id, {
        onDelete: "cascade",
      }),
    collectionSlug: varchar("collection_slug", { length: 255 }),
    objektId: varchar("objekt_id", { length: 255 }),
    price: real("price"),
    isQyop: boolean("is_qyop").notNull().default(false),
    note: varchar("note", { length: 255 }),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("list_entries_list_idx").on(t.listId),
    index("list_entries_objekt_idx").on(t.objektId),
    index("list_entries_collection_slug_idx").on(t.collectionSlug),
    uniqueIndex("list_entries_list_objekt_uniq")
      .on(t.listId, t.objektId)
      .where(sql`objekt_id IS NOT NULL`),
  ],
);

export const hiddenTradePartner = pgTable(
  "hidden_trade_partner",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    hiddenUserId: text("hidden_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.hiddenUserId] }),
    index("hidden_trade_partner_hidden_user_id_idx").on(t.hiddenUserId),
  ],
);

export const notification = pgTable(
  "notification",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type")
      .$type<"want_match" | "have_wanted" | "offer" | "trade" | "sanction">()
      .notNull(),
    payload: jsonb("payload").notNull(),
    groupKey: text("group_key").notNull(),
    readAt: timestamp("read_at", { mode: "string", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("notification_user_created_idx").on(t.userId, t.createdAt.desc()),
    uniqueIndex("notification_unread_group_uniq")
      .on(t.userId, t.groupKey)
      .where(sql`read_at IS NULL`),
  ],
);

export const notificationPref = pgTable(
  "notification_pref",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").$type<"want_match" | "have_wanted" | "offer" | "trade">().notNull(),
    enabled: boolean("enabled").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.type] })],
);

export const wantAlertSent = pgTable(
  "want_alert_sent",
  {
    wantListId: integer("want_list_id").notNull(),
    sourceListId: integer("source_list_id").notNull(),
    collectionSlug: varchar("collection_slug", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.wantListId, t.sourceListId, t.collectionSlug] })],
);

export const conversation = pgTable(
  "conversation",
  {
    id: serial("id").primaryKey(),
    userLow: text("user_low")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userHigh: text("user_high")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // no foreign key: the pair's cascade already removes the row
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
    lastMessageId: bigint("last_message_id", { mode: "number" }),
    lastMessageAt: timestamp("last_message_at", { mode: "string", withTimezone: true }),
  },
  (t) => [
    uniqueIndex("conversation_pair_uniq").on(t.userLow, t.userHigh),
    index("conversation_user_high_idx").on(t.userHigh),
    // ids are mixed-case and the database collation is not byte order, so `pairKey` sorts by code point
    check("conversation_pair_ordered", sql`${t.userLow} COLLATE "C" < ${t.userHigh}`),
    check("conversation_created_by_member", sql`${t.createdBy} IN (${t.userLow}, ${t.userHigh})`),
  ],
);

export const conversationMember = pgTable(
  "conversation_member",
  {
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    request: boolean("request").notNull().default(false),
    archivedAt: timestamp("archived_at", { mode: "string", withTimezone: true }),
    mutedUntil: timestamp("muted_until", { mode: "string", withTimezone: true }),
    lastReadMessageId: bigint("last_read_message_id", { mode: "number" }),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.userId] }),
    index("conversation_member_user_id_idx").on(t.userId),
  ],
);

export const message = pgTable(
  "message",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    // no foreign key: a sender is a member, and the conversation's cascade removes the row
    senderId: text("sender_id").notNull(),
    body: text("body"),
    card: jsonb("card"),
    caution: text("caution").array(),
    offerId: integer("offer_id").references((): AnyPgColumn => offer.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
    // the content stays, so a report can still show what was unsent
    unsentAt: timestamp("unsent_at", { mode: "string", withTimezone: true }),
  },
  (t) => [
    index("message_conversation_id_idx").on(t.conversationId, t.id.desc()),
    index("message_offer_id_idx")
      .on(t.offerId)
      .where(sql`offer_id IS NOT NULL`),
    check(
      "message_has_content",
      sql`${t.body} IS NOT NULL OR ${t.card} IS NOT NULL OR ${t.offerId} IS NOT NULL`,
    ),
    check("message_body_length", sql`char_length(${t.body}) BETWEEN 1 AND 2000`),
  ],
);

export const offer = pgTable(
  "offer",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    parentId: integer("parent_id").references((): AnyPgColumn => offer.id, {
      onDelete: "set null",
    }),
    status: text("status")
      .$type<
        "open" | "accepted" | "declined" | "withdrawn" | "countered" | "cancelled" | "expired"
      >()
      .notNull()
      .default("open"),
    cancelReason: text("cancel_reason").$type<
      "reserved" | "blocked" | "sanction" | "token_moved" | "account_deleted" | "not_transferable"
    >(),
    topupAmount: numeric("topup_amount", { precision: 12, scale: 2 }),
    topupCurrency: varchar("topup_currency", { length: 10 }),
    topupPayer: text("topup_payer").$type<"from" | "to">(),
    note: text("note"),
    caution: text("caution").array(),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { mode: "string", withTimezone: true })
      .notNull()
      .default(sql`now() + interval '7 days'`),
    respondedAt: timestamp("responded_at", { mode: "string", withTimezone: true }),
  },
  (t) => [
    uniqueIndex("offer_one_open")
      .on(t.conversationId)
      .where(sql`status = 'open'`),
    index("offer_conversation_id_idx").on(t.conversationId, t.id.desc()),
    index("offer_from_user_idx").on(t.fromUserId, t.createdAt.desc()),
    index("offer_to_user_idx").on(t.toUserId, t.createdAt.desc()),
    index("offer_parent_id_idx")
      .on(t.parentId)
      .where(sql`parent_id IS NOT NULL`),
    check(
      "offer_status",
      sql`${t.status} IN ('open', 'accepted', 'declined', 'withdrawn', 'countered', 'cancelled', 'expired')`,
    ),
    check(
      "offer_cancel_reason",
      sql`${t.cancelReason} IN ('reserved', 'blocked', 'sanction', 'token_moved', 'account_deleted', 'not_transferable')`,
    ),
    check("offer_topup_payer", sql`${t.topupPayer} IN ('from', 'to')`),
    check(
      "offer_topup_complete",
      sql`(${t.topupAmount} IS NULL) = (${t.topupCurrency} IS NULL) AND (${t.topupAmount} IS NULL) = (${t.topupPayer} IS NULL)`,
    ),
    check("offer_topup_positive", sql`${t.topupAmount} > 0`),
    check("offer_note_length", sql`char_length(${t.note}) BETWEEN 1 AND 280`),
    check("offer_parties_differ", sql`${t.fromUserId} <> ${t.toUserId}`),
  ],
);

export const offerItem = pgTable(
  "offer_item",
  {
    id: serial("id").primaryKey(),
    offerId: integer("offer_id")
      .notNull()
      .references(() => offer.id, { onDelete: "cascade" }),
    side: text("side").$type<"give" | "get">().notNull(),
    collectionSlug: varchar("collection_slug", { length: 255 }).notNull(),
    objektId: varchar("objekt_id", { length: 255 }),
    listId: integer("list_id").references(() => lists.id, { onDelete: "set null" }),
  },
  (t) => [
    index("offer_item_offer_id_idx").on(t.offerId),
    index("offer_item_objekt_id_idx")
      .on(t.objektId)
      .where(sql`objekt_id IS NOT NULL`),
    index("offer_item_list_id_idx")
      .on(t.listId)
      .where(sql`list_id IS NOT NULL`),
    check("offer_item_side", sql`${t.side} IN ('give', 'get')`),
    check("offer_item_give_specific", sql`${t.side} <> 'give' OR ${t.objektId} IS NOT NULL`),
  ],
);

export const trade = pgTable(
  "trade",
  {
    id: serial("id").primaryKey(),
    offerId: integer("offer_id")
      .notNull()
      .references(() => offer.id, { onDelete: "cascade" }),
    userA: text("user_a")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    userB: text("user_b")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: text("status")
      .$type<"in_progress" | "completed" | "cancelled" | "failed">()
      .notNull()
      .default("in_progress"),
    acceptedAt: timestamp("accepted_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { mode: "string", withTimezone: true }),
    cancelledBy: text("cancelled_by").references(() => user.id, { onDelete: "cascade" }),
    // `expired` also ends a failed trade
    cancelReason: text("cancel_reason").$type<
      "party" | "token_moved" | "expired" | "not_transferable"
    >(),
    remindedAt: timestamp("reminded_at", { mode: "string", withTimezone: true }),
  },
  (t) => [
    uniqueIndex("trade_offer_id_uniq").on(t.offerId),
    index("trade_user_a_idx").on(t.userA, t.acceptedAt.desc()),
    index("trade_user_b_idx").on(t.userB, t.acceptedAt.desc()),
    check("trade_status", sql`${t.status} IN ('in_progress', 'completed', 'cancelled', 'failed')`),
    check(
      "trade_cancel_reason",
      sql`${t.cancelReason} IN ('party', 'token_moved', 'expired', 'not_transferable')`,
    ),
  ],
);

export const tradeLeg = pgTable(
  "trade_leg",
  {
    id: serial("id").primaryKey(),
    tradeId: integer("trade_id")
      .notNull()
      .references(() => trade.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // lowercase, as linked at accept, so a later unlink cannot strand or misattribute a leg
    fromAddresses: text("from_addresses").array().notNull(),
    toAddresses: text("to_addresses").array().notNull(),
    collectionSlug: varchar("collection_slug", { length: 255 }).notNull(),
    objektId: varchar("objekt_id", { length: 255 }),
    open: boolean("open").notNull().default(true),
    verifiedAt: timestamp("verified_at", { mode: "string", withTimezone: true }),
    // set while the indexer reads the objekt as non-transferable, after something was sent
    untransferableAt: timestamp("untransferable_at", { mode: "string", withTimezone: true }),
    txHash: text("tx_hash"),
    verifiedObjektId: varchar("verified_objekt_id", { length: 255 }),
    // the indexer's transfer row, kept for debugging; a re-index gives it a new id, so nothing reads it
    transferId: uuid("transfer_id"),
  },
  (t) => [
    index("trade_leg_trade_id_idx").on(t.tradeId),
    index("trade_leg_open_idx")
      .on(t.tradeId)
      .where(sql`open`),
    uniqueIndex("trade_leg_transfer_id_uniq").on(t.transferId),
    // one transfer verifies at most one leg anywhere; hash and token survive a re-index
    uniqueIndex("trade_leg_transfer_uniq")
      .on(t.txHash, t.verifiedObjektId)
      .where(sql`tx_hash IS NOT NULL`),
    // an objekt sits in at most one open trade; accept relies on this to settle races
    uniqueIndex("trade_leg_reserved")
      .on(t.objektId)
      .where(sql`open AND objekt_id IS NOT NULL`),
    index("trade_leg_from_user_id_idx").on(t.fromUserId),
    index("trade_leg_to_user_id_idx").on(t.toUserId),
  ],
);

/** Another copy of a specific leg's collection the giver sent the receiver, for the receiver to accept or decline. */
export const tradeSubstitute = pgTable(
  "trade_substitute",
  {
    id: serial("id").primaryKey(),
    tradeLegId: integer("trade_leg_id")
      .notNull()
      .references(() => tradeLeg.id, { onDelete: "cascade" }),
    txHash: text("tx_hash").notNull(),
    // the transfer's token_id
    objektId: varchar("objekt_id", { length: 255 }).notNull(),
    transferredAt: timestamp("transferred_at", { mode: "string", withTimezone: true }).notNull(),
    status: text("status")
      .$type<"pending" | "accepted" | "declined">()
      .notNull()
      .default("pending"),
    decidedAt: timestamp("decided_at", { mode: "string", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    // not unique without the leg: one copy may wait against legs of two trades
    uniqueIndex("trade_substitute_transfer_uniq").on(t.tradeLegId, t.txHash, t.objektId),
    check("trade_substitute_status", sql`${t.status} IN ('pending', 'accepted', 'declined')`),
  ],
);

export const tradeFeedback = pgTable(
  "trade_feedback",
  {
    tradeId: integer("trade_id")
      .notNull()
      .references(() => trade.id, { onDelete: "cascade" }),
    fromUserId: text("from_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    toUserId: text("to_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rating: text("rating").$type<"positive" | "neutral" | "negative">().notNull(),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.tradeId, t.fromUserId] }),
    index("trade_feedback_to_user_id_idx").on(t.toUserId),
    check("trade_feedback_rating", sql`${t.rating} IN ('positive', 'neutral', 'negative')`),
    check("trade_feedback_not_self", sql`${t.fromUserId} <> ${t.toUserId}`),
  ],
);

export const messagePref = pgTable(
  "message_pref",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    allow: text("allow").$type<"anyone" | "nobody">().notNull().default("anyone"),
    chatAs: citext("chat_as", { length: 42 }),
    showActivity: boolean("show_activity").notNull().default(true),
  },
  (t) => [check("message_pref_allow", sql`${t.allow} IN ('anyone', 'nobody')`)],
);

export const userBlock = pgTable(
  "user_block",
  {
    blockerId: text("blocker_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    blockedId: text("blocked_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.blockerId, t.blockedId] }),
    index("user_block_blocked_id_idx").on(t.blockedId),
    check("user_block_not_self", sql`${t.blockerId} <> ${t.blockedId}`),
  ],
);

export const report = pgTable(
  "report",
  {
    id: serial("id").primaryKey(),
    reporterId: text("reporter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    targetUserId: text("target_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // the excerpt is the evidence, so the report outlives the conversation
    conversationId: integer("conversation_id").references(() => conversation.id, {
      onDelete: "set null",
    }),
    reason: text("reason")
      .$type<"scam" | "harassment" | "spam" | "impersonation" | "other">()
      .notNull(),
    note: text("note"),
    excerpt: jsonb("excerpt"),
    status: text("status").$type<"open" | "dismissed" | "actioned">().notNull().default("open"),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedBy: text("resolved_by").references(() => user.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at", { mode: "string", withTimezone: true }),
    tradeId: integer("trade_id").references((): AnyPgColumn => trade.id, { onDelete: "set null" }),
  },
  (t) => [
    index("report_trade_id_idx")
      .on(t.tradeId)
      .where(sql`trade_id IS NOT NULL`),
    index("report_status_target_idx").on(t.status, t.targetUserId),
    index("report_target_user_id_idx").on(t.targetUserId),
    index("report_reporter_target_idx").on(t.reporterId, t.targetUserId, t.createdAt.desc()),
    check(
      "report_reason",
      sql`${t.reason} IN ('scam', 'harassment', 'spam', 'impersonation', 'other')`,
    ),
    check("report_status", sql`${t.status} IN ('open', 'dismissed', 'actioned')`),
    check("report_note_length", sql`char_length(${t.note}) <= 500`),
  ],
);

export const messageFlag = pgTable(
  "message_flag",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    // no foreign key: a flag outlives its message, and is never joined to it
    messageId: bigint("message_id", { mode: "number" }).notNull(),
    category: text("category").$type<"send_first" | "outside_payment">().notNull(),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("message_flag_user_category_idx").on(t.userId, t.category),
    check("message_flag_category", sql`${t.category} IN ('send_first', 'outside_payment')`),
  ],
);

export const userSanction = pgTable(
  "user_sanction",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").$type<"warn" | "chat_mute" | "trade_block" | "ban">().notNull(),
    reason: text("reason").notNull(),
    expiresAt: timestamp("expires_at", { mode: "string", withTimezone: true }),
    issuedBy: text("issued_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { mode: "string", withTimezone: true }),
    revokedBy: text("revoked_by").references(() => user.id, { onDelete: "set null" }),
  },
  (t) => [
    index("user_sanction_user_id_idx").on(t.userId),
    index("user_sanction_active_idx")
      .on(t.userId, t.type)
      .where(sql`revoked_at IS NULL`),
    check("user_sanction_type", sql`${t.type} IN ('warn', 'chat_mute', 'trade_block', 'ban')`),
  ],
);

export const modAudit = pgTable(
  "mod_audit",
  {
    id: serial("id").primaryKey(),
    actorId: text("actor_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action")
      .$type<"dismiss" | "warn" | "chat_mute" | "trade_block" | "ban" | "revoke" | "set_role">()
      .notNull(),
    targetUserId: text("target_user_id").references(() => user.id, { onDelete: "set null" }),
    reportIds: integer("report_ids").array(),
    detail: jsonb("detail"),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("mod_audit_target_created_idx").on(t.targetUserId, t.createdAt.desc())],
);

export const pins = pgTable(
  "pins",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    tokenId: integer("token_id").notNull(),
    order: integer("order"),
    createdAt: timestamp("created_at", { mode: "string", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("pins_address_idx").on(t.address),
    index("pins_token_id_idx").on(t.tokenId),
    uniqueIndex("pins_address_token_id_idx").on(t.address, t.tokenId),
  ],
);

export const lockedObjekts = pgTable(
  "locked_objekts",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    tokenId: integer("token_id").notNull(),
  },
  (t) => [
    index("locked_objekts_address_idx").on(t.address),
    index("locked_objekts_token_id_idx").on(t.tokenId),
    uniqueIndex("locked_objekts_address_token_id_idx").on(t.address, t.tokenId),
  ],
);

export const currencyRates = pgTable("currency_rates", {
  code: varchar("code", { length: 10 }).primaryKey(),
  rate: real("rate").notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", withTimezone: true }).notNull().defaultNow(),
});

export type AccessToken = typeof accessToken.$inferSelect;
export type UserAddress = typeof userAddress.$inferSelect;
export type Pin = typeof pins.$inferSelect;

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type List = typeof lists.$inferSelect;
export type ListEntry = typeof listEntries.$inferSelect;
export type Offer = typeof offer.$inferSelect;
export type OfferItem = typeof offerItem.$inferSelect;
export type Trade = typeof trade.$inferSelect;
