import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const collections = pgTable(
  "collection",
  {
    id: uuid().primaryKey(),
    contract: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    slug: text().notNull(),
    collectionId: text("collection_id").notNull(),
    season: text().notNull(),
    member: text().notNull(),
    artist: text().notNull(),
    collectionNo: text("collection_no").notNull(),
    class: text().notNull(),
    thumbnailImage: text("thumbnail_image").notNull(),
    frontImage: text("front_image").notNull(),
    backImage: text("back_image").notNull(),
    backgroundColor: text("background_color").notNull(),
    textColor: text("text_color").notNull(),
    accentColor: text("accent_color").notNull(),
    comoAmount: integer("como_amount").notNull(),
    onOffline: text("on_offline").notNull().$type<"online" | "offline">(),
    bandImageUrl: varchar("band_image_url", { length: 255 }),
    frontMedia: varchar("front_media", { length: 255 }),
  },
  (table) => [
    index("IDX_429351eac26f87942861266e48").using("btree", table.onOffline.asc().nullsLast()),
    index("IDX_6f89ec57ebbfd978e196751051").using("btree", table.artist.asc().nullsLast()),
    uniqueIndex("IDX_75a6fd6eedd7fa7378de400b0a").using("btree", table.slug.asc().nullsLast()),
    index("IDX_76242b6e82adf6f4ab4b388858").using("btree", table.member.asc().nullsLast()),
    index("IDX_81f585f60e03d2dc803d8a4945").using("btree", table.season.asc().nullsLast()),
    index("IDX_a8dbe2a49e54f73e2e7063dbb0").using("btree", table.collectionNo.asc().nullsLast()),
    index("idx_como_calendar").using(
      "btree",
      table.class.asc().nullsLast(),
      table.artist.asc().nullsLast(),
      table.id.asc().nullsLast(),
    ),
    index("IDX_d01899107849250643b52f2324").using("btree", table.class.asc().nullsLast()),
    index("IDX_e814aff6539600dfcc88af41fc").using("btree", table.contract.asc().nullsLast()),
    index("IDX_f2c977a66579d262693a8cdbcd").using("btree", table.createdAt.asc().nullsLast()),
  ],
);

export const objekts = pgTable(
  "objekt",
  {
    id: varchar().primaryKey(),
    owner: text().notNull(),
    mintedAt: timestamp("minted_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
    serial: integer().notNull(),
    transferable: boolean().notNull(),
    collectionId: uuid("collection_id").references(() => collections.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  },
  (table) => [
    index("IDX_19209bac5cab521e9327f74013").using("btree", table.serial.asc().nullsLast()),
    index("IDX_3d4c25bad83bb3fdae75fc0692").using("btree", table.receivedAt.asc().nullsLast()),
    index("IDX_463f5339e811c02da943075d43").using(
      "btree",
      table.owner.asc().nullsLast(),
      table.receivedAt.desc().nullsFirst(),
    ),
    index("IDX_f47af96878c586b3fbb6d9439c").using("btree", table.transferable.asc().nullsLast()),
    index("IDX_objekt_collection_owner").using(
      "btree",
      table.collectionId.asc().nullsLast(),
      table.owner.asc().nullsLast(),
    ),
    index("IDX_objekt_hourly_stats").using(
      "btree",
      table.mintedAt.asc().nullsLast(),
      table.collectionId.asc().nullsLast(),
    ),
    index("idx_objekt_owner_collection_id").using(
      "btree",
      table.owner.asc().nullsLast(),
      table.collectionId.asc().nullsLast(),
    ),
    index("idx_objekt_spin_serial")
      .using("btree", table.serial.asc().nullsLast())
      .where(sql`(owner = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f'::text)`),
    index("idx_objekt_transferable_count").using("btree", table.collectionId.asc().nullsLast()),
    index("IDX_objekts_spin_initial")
      .using("btree", table.receivedAt.desc().nullsFirst())
      .where(sql`(owner = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f'::text)`),
  ],
);

export const transfers = pgTable(
  "transfer",
  {
    id: uuid().primaryKey(),
    from: text().notNull(),
    to: text().notNull(),
    timestamp: timestamp({ withTimezone: true }).notNull(),
    tokenId: text("token_id").notNull(),
    hash: text().notNull(),
    objektId: varchar("objekt_id").references(() => objekts.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
    collectionId: uuid("collection_id").references(() => collections.id, {
      onDelete: "cascade",
      onUpdate: "cascade",
    }),
  },
  (table) => [
    index("IDX_15a8d2966ae7e5e9b2ff47104f").using("btree", table.collectionId.asc().nullsLast()),
    index("idx_transfer_from_timestamp").using(
      "btree",
      table.from.asc().nullsLast(),
      table.timestamp.desc().nullsFirst(),
    ),
    index("idx_transfer_objekt_id").using("btree", table.objektId.asc().nullsLast()),
    index("idx_transfer_timestamp_cosmo_spin")
      .using("btree", table.timestamp.desc().nullsFirst())
      .where(
        sql`(("from" = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f'::text) OR ("to" = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f'::text))`,
      ),
    index("idx_transfer_to_timestamp").using(
      "btree",
      table.to.asc().nullsLast(),
      table.timestamp.desc().nullsFirst(),
    ),
    index("transfer_collection_timestamp_id_idx").using(
      "btree",
      table.collectionId.asc().nullsLast(),
      table.timestamp.desc().nullsFirst(),
      table.id.desc().nullsFirst(),
    ),
    index("transfer_from_timestamp_id_idx").using(
      "btree",
      table.from.asc().nullsLast(),
      table.timestamp.desc().nullsFirst(),
      table.id.desc().nullsFirst(),
    ),
    index("transfer_to_timestamp_id_idx").using(
      "btree",
      table.to.asc().nullsLast(),
      table.timestamp.desc().nullsFirst(),
      table.id.desc().nullsFirst(),
    ),
  ],
);

export const comoBalances = pgTable(
  "como_balance",
  {
    id: uuid().primaryKey(),
    owner: text().notNull(),
    amount: numeric().notNull(),
    tokenId: numeric("token_id").notNull(),
  },
  (table) => [
    index("IDX_como_balance_owner_token_id").using(
      "btree",
      table.owner.asc().nullsLast(),
      table.tokenId.asc().nullsLast(),
    ),
    index("IDX_d840d7bff36ad3e0d91ea8b680").using("btree", table.amount.asc().nullsLast()),
    unique("UQ_como_balance_owner_token_id").on(table.owner, table.tokenId),
  ],
);

export const votes = pgTable(
  "vote",
  {
    id: uuid().primaryKey(),
    from: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    pollId: integer("poll_id").notNull(),
    amount: numeric().notNull(),
    blockNumber: integer("block_number"),
    hash: text(),
    tokenId: integer("token_id").notNull(),
    logIndex: integer("log_index").notNull(),
    candidateId: integer("candidate_id"),
  },
  (table) => [
    index("IDX_0d7459852150cf964af26adcf6").using("btree", table.pollId.asc().nullsLast()),
    index("IDX_41065267c13533592a24836335").using("btree", table.createdAt.asc().nullsLast()),
    index("IDX_701e95fc921b4ca38caa9a4a2c").using("btree", table.amount.asc().nullsLast()),
    index("IDX_8ea4539f32b721cfed8cb4796c").using("btree", table.from.asc().nullsLast()),
    index("idx_vote_revealed")
      .using("btree", table.pollId.asc().nullsLast(), table.blockNumber.asc().nullsLast())
      .where(sql`(candidate_id IS NOT NULL)`),
    index("idx_vote_token_id").using("btree", table.tokenId.asc().nullsLast()),
  ],
);

export type Transfer = typeof transfers.$inferSelect;
export type Objekt = typeof objekts.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type ComoBalance = typeof comoBalances.$inferSelect;
export type Vote = typeof votes.$inferSelect;
