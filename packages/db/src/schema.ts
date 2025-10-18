import { relations } from "drizzle-orm";
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
import { account, session, user, verification } from "./schema/auth";
import { citext } from "./schema/custom-type";

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
  },
  (t) => [
    uniqueIndex("user_address_address_idx").on(t.address),
    index("user_address_nickname_idx").on(t.nickname),
    uniqueIndex("user_address_address_nickname_idx").on(t.address, t.nickname),
    index("user_address_user_id_idx").on(t.userId),
  ],
);

export const userAddressRelations = relations(userAddress, ({ one, many }) => ({
  user: one(user, { fields: [userAddress.userId], references: [user.id] }),
  pins: many(pins),
}));

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

export const listsRelations = relations(lists, ({ many, one }) => ({
  entries: many(listEntries),
  user: one(user, { fields: [lists.userId], references: [user.id] }),
}));

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

export const listEntriesRelations = relations(listEntries, ({ one }) => ({
  list: one(lists, { fields: [listEntries.listId], references: [lists.id] }),
}));

export const profileLists = pgTable(
  "profile_list",
  {
    id: serial("id").primaryKey(),
    address: text("address").notNull(),
    slug: varchar("slug", { length: 12 }).notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("profile_list_slug_idx").on(t.slug)],
);

export const profileListRelations = relations(profileLists, ({ many, one }) => ({
  entries: many(profileListEntries),
  user: one(userAddress, {
    fields: [profileLists.address],
    references: [userAddress.address],
  }),
}));

export const profileListEntries = pgTable(
  "profile_list_entries",
  {
    id: serial("id").primaryKey(),
    listId: integer("list_id")
      .notNull()
      .references(() => profileLists.id, {
        onDelete: "cascade",
      }),
    tokenId: integer("token_id").notNull(),
    receivedAt: timestamp("received_at").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("profile_list_entries_list_idx").on(t.listId)],
);

export const profileListEntriesRelations = relations(profileListEntries, ({ one }) => ({
  list: one(profileLists, {
    fields: [profileListEntries.listId],
    references: [profileLists.id],
  }),
}));

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

export const pinsRelations = relations(pins, ({ one }) => ({
  profile: one(userAddress, {
    fields: [pins.address],
    references: [userAddress.address],
  }),
}));

export const lockedObjekts = pgTable(
  "locked_objekts",
  {
    id: serial("id").primaryKey(),
    address: citext("address", { length: 42 }).notNull(),
    tokenId: integer("tokenId").notNull(),
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
