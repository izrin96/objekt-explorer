import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

import { account, session, user, verification } from "./auth-schema";
import { citext } from "./custom-type";

export { user, session, account, verification };

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
    linkedAt: timestamp("linked_at"),
    bannerImgUrl: text("banner_img_url"),
    bannerImgType: text("banner_img_type"),
    hideUser: boolean("hide_user").default(true),
    privateProfile: boolean("private_profile").default(false),
    privateSerial: boolean("private_serial").default(false),
    hideActivity: boolean("hide_activity").default(false),
    hideTransfer: boolean("hide_transfer").default(false),
    hideNickname: boolean("hide_nickname").default(false),
    isAbstract: boolean("is_abstract").default(false),
    gridColumns: integer("grid_columns"),
    cosmoId: integer("cosmo_id"),
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
    hideUser: boolean("hide_user").default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    gridColumns: integer("grid_columns"),
  },
  (t) => [uniqueIndex("lists_slug_idx").on(t.slug)],
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
    collectionSlug: varchar("collection_slug", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("list_entries_list_idx").on(t.listId)],
);

export const profileLists = pgTable(
  "profile_list",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onDelete: "cascade",
      }),
    address: text("address").notNull(),
    slug: varchar("slug", { length: 12 }).notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    gridColumns: integer("grid_columns"),
  },
  (t) => [uniqueIndex("profile_list_slug_idx").on(t.slug)],
);

export const profileListEntries = pgTable(
  "profile_list_entries",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id")
      .notNull()
      .references(() => profileLists.id, {
        onDelete: "cascade",
      }),
    objektId: varchar("objekt_id").notNull(),
    tokenId: integer("token_id").notNull(),
    receivedAt: timestamp("received_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("profile_list_entries_list_idx").on(t.listId),
    uniqueIndex("profile_list_entries_objekt_id_unique").on(t.listId, t.objektId),
  ],
);

export const pins = pgTable(
  "pins",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    tokenId: integer("token_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("pins_address_idx").on(t.address), index("pins_token_id_idx").on(t.tokenId)],
);

export const lockedObjekts = pgTable(
  "locked_objekts",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    tokenId: integer("token_id").notNull(),
  },
  (t) => [index("locked_objekts_address_idx").on(t.address)],
);

export type AccessToken = typeof accessToken.$inferSelect;
export type UserAddress = typeof userAddress.$inferSelect;
export type Pin = typeof pins.$inferSelect;

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type Account = typeof account.$inferSelect;
export type Verification = typeof verification.$inferSelect;
export type List = typeof lists.$inferSelect;
export type ListEntry = typeof listEntries.$inferSelect;
export type ProfileList = typeof profileLists.$inferSelect;
export type ProfileListEntry = typeof profileListEntries.$inferSelect;
