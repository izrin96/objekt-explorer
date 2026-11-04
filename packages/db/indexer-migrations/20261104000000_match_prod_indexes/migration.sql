-- Brings a database built from the migrations to the index set production runs. Production's
-- indexes were built and dropped by hand (CONCURRENTLY, outside a migration), so there every
-- statement here is a no-op; a fresh database gets them while its tables are still empty.

DROP INDEX IF EXISTS "IDX_0b05935e7f689d090d1a67a8cf";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_15a8d2966ae7e5e9b2ff47104f";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_3d4c25bad83bb3fdae75fc0692";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_463f5339e811c02da943075d43";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_4c098d306adb4722a962ec89ea";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_8056b2df70cd298ce447bc186f";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_b1bff3977e6bfbca8ea3747d50";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_c630f7364ebb0c91d431679011";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_e955d648996ebf3ae54bfa4c40";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_f47af96878c586b3fbb6d9439c";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_objekt_hourly_stats";--> statement-breakpoint
DROP INDEX IF EXISTS "IDX_objekts_spin_initial";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_objekt_spin_serial";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_objekt_transferable_count";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_transfer_objekt_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_transfer_timestamp_cosmo_spin";--> statement-breakpoint
DROP INDEX IF EXISTS "transfer_collection_timestamp_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "transfer_from_timestamp_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "transfer_to_timestamp_id_idx";--> statement-breakpoint
-- drop these two in production with DROP INDEX CONCURRENTLY before this runs; here a plain drop
-- would lock objekt behind every running read
DROP INDEX IF EXISTS "idx_objekt_spin_received_id";--> statement-breakpoint
DROP INDEX IF EXISTS "idx_objekt_spin_serial_id";--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_objekt_collection_cover ON objekt USING btree (collection_id) INCLUDE (id, serial, minted_at);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_objekt_collection_serial ON objekt USING btree (collection_id, serial);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_objekt_minted_at ON objekt USING btree (minted_at);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_objekt_owner_received_id ON objekt USING btree (owner, received_at DESC, id DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_objekt_spin_transferable ON objekt USING btree (id) WHERE ((owner = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f'::text) AND transferable);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_transfer_collection_from_id ON transfer USING btree (collection_id, "from", id DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_transfer_collection_to_id ON transfer USING btree (collection_id, "to", id DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_transfer_collection_ts_id ON transfer USING btree (collection_id, "timestamp" DESC, id DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_transfer_from_ts_id ON transfer USING btree ("from", "timestamp" DESC, id DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_transfer_mint_collection_ts_id ON transfer USING btree (collection_id, "timestamp" DESC, id DESC) WHERE ("from" = '0x0000000000000000000000000000000000000000'::text);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_transfer_mint_spin_ts ON transfer USING btree ("timestamp" DESC, id DESC) WHERE (("from" = '0x0000000000000000000000000000000000000000'::text) AND ("to" = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f'::text));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_transfer_mint_to_ts_id ON transfer USING btree ("to", "timestamp" DESC, id DESC) WHERE ("from" = '0x0000000000000000000000000000000000000000'::text);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_transfer_objekt_timestamp_desc ON transfer USING btree (objekt_id, "timestamp" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_transfer_spin_collection_ts ON transfer USING btree (collection_id, "timestamp" DESC, id DESC) WHERE ("to" = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f'::text);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_transfer_spin_ts ON transfer USING btree ("timestamp" DESC, id DESC) WHERE ("to" = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f'::text);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_transfer_to_ts_id ON transfer USING btree ("to", "timestamp" DESC, id DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_transfer_ts_id ON transfer USING btree ("timestamp" DESC, id DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_transfer_type_transfer_collection_ts_id ON transfer USING btree (collection_id, "timestamp" DESC, id DESC) WHERE (("from" <> '0x0000000000000000000000000000000000000000'::text) AND ("to" <> '0xd3d5f29881ad87bb10c1100e2c709c9596de345f'::text));
