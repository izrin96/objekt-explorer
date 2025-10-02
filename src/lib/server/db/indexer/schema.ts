import { relations, sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { ParsedDate } from "@/lib/universal/common";

export const collections = pgTable(
  "collection",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    contract: varchar("contract", { length: 42 }).notNull(),
    createdAt: timestamp("created_at").notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    collectionId: varchar("collection_id", { length: 255 }).notNull(),
    season: varchar("season", { length: 32 }).notNull(),
    member: varchar("member", { length: 32 }).notNull(),
    artist: varchar("artist", { length: 32 }).notNull(),
    collectionNo: varchar("collection_no", { length: 8 }).notNull(),
    class: varchar("class", { length: 8 }).notNull(),
    thumbnailImage: varchar("thumbnail_image", { length: 255 }).notNull(),
    frontImage: varchar("front_image", { length: 255 }).notNull(),
    backImage: varchar("back_image", { length: 255 }).notNull(),
    backgroundColor: varchar("background_color", { length: 8 }).notNull(),
    textColor: varchar("text_color", { length: 8 }).notNull(),
    accentColor: varchar("accent_color", { length: 8 }).notNull(),
    comoAmount: integer("como_amount").notNull(),
    onOffline: varchar("on_offline", { length: 16 }).notNull().$type<"online" | "offline">(),
    bandImageUrl: varchar("band_image_url", { length: 255 }),
  },
  (table) => [
    index("slug_idx").on(table.slug),
    index("season_idx").on(table.season),
    index("member_idx").on(table.member),
    index("artist_idx").on(table.artist),
    index("class_idx").on(table.class),
    index("collectionNo_idx").on(table.collectionNo),
    index("onOffline_idx").on(table.onOffline),
  ],
);

export const collectionRelations = relations(collections, ({ many }) => ({
  transfers: many(transfers),
  objekts: many(objekts),
}));

export const objekts = pgTable(
  "objekt",
  {
    id: serial("id").primaryKey(),
    owner: varchar("owner", { length: 42 }).notNull(),
    mintedAt: timestamp("minted_at").notNull(),
    receivedAt: timestamp("received_at").notNull(),
    serial: integer("serial").notNull(),
    transferable: boolean("transferable").notNull(),
    collectionId: varchar("collection_id", { length: 36 })
      .notNull()
      .references(() => collections.id),
  },
  (table) => [
    index("owner_idx").on(table.owner),
    index("collection_id_idx").on(table.collectionId),
  ],
);

export const objektRelations = relations(objekts, ({ many, one }) => ({
  transfers: many(transfers),
  collection: one(collections, {
    fields: [objekts.collectionId],
    references: [collections.id],
  }),
}));

export const transfers = pgTable(
  "transfer",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    hash: varchar("hash", { length: 255 }).notNull(),
    from: varchar("from", { length: 42 }).notNull(),
    to: varchar("to", { length: 42 }).notNull(),
    timestamp: timestamp("timestamp").notNull(),
    tokenId: integer("token_id").notNull(),
    objektId: varchar("objekt_id", { length: 12 })
      .notNull()
      .references(() => objekts.id),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id),
  },
  (table) => [
    index("from_idx").on(table.from),
    index("to_idx").on(table.to),
    index("objekt_id_idx").on(table.objektId),
    index("collection_id_idx").on(table.collectionId),
  ],
);

export const transferRelations = relations(transfers, ({ one }) => ({
  objekt: one(objekts, {
    fields: [transfers.objektId],
    references: [objekts.id],
  }),
  collection: one(collections, {
    fields: [transfers.collectionId],
    references: [collections.id],
  }),
}));

export const comoBalances = pgTable(
  "como_balance",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    contract: varchar("contract", { length: 42 }).notNull(),
    owner: varchar("owner", { length: 42 }).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
  },
  (table) => [index("contract_idx").on(table.contract), index("owner_idx").on(table.owner)],
);

export const votes = pgTable(
  "vote",
  {
    id: uuid("id").primaryKey().default(sql`uuidv7()`),
    from: varchar("from", { length: 42 }).notNull(),
    createdAt: timestamp("created_at").notNull(),
    contract: varchar("contract", { length: 42 }).notNull(),
    pollId: integer("poll_id").notNull(),
    candidateId: integer("candidate_id"),
    index: integer("index").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
  },
  (table) => [
    index("from_idx").on(table.from),
    index("contract_idx").on(table.contract),
    index("poll_id_idx").on(table.pollId),
  ],
);

export type TransferSelect = typeof transfers.$inferSelect;
export type ObjektSelect = typeof objekts.$inferSelect;
export type CollectionSelect = typeof collections.$inferSelect;
export type ComoBalance = typeof comoBalances.$inferSelect;
export type VoteSelect = typeof votes.$inferSelect;

export type Objekt<T = ParsedDate> = Omit<ObjektSelect, "mintedAt" | "receivedAt"> & {
  mintedAt: T;
  receivedAt: T;
};

export type Collection<T = ParsedDate> = Omit<CollectionSelect, "createdAt"> & {
  createdAt: T;
};

export type Transfer<T = ParsedDate> = Omit<TransferSelect, "timestamp"> & {
  timestamp: T;
};

export type Vote<T = ParsedDate> = Omit<VoteSelect, "createdAt"> & {
  createdAt: T;
};
