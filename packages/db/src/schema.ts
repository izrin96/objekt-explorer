import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
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
    hideUser: boolean("hide_user").notNull().default(true),
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
    hideUser: boolean("hide_user").notNull().default(true),
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
  },
  (t) => [
    uniqueIndex("lists_slug_idx").on(t.slug),
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
