-- Spin's held count (`countHeld`) groups its 7.4M objekts by collection and looks up each one's
-- lowest serial; this index serves both without reading the table. Build it in production with
-- CREATE INDEX CONCURRENTLY before this runs: here it would build inside a transaction and hold
-- writes to objekt for minutes.
CREATE INDEX IF NOT EXISTS idx_objekt_spin_held ON objekt USING btree (collection_id, serial, id) INCLUDE (received_at) WHERE (owner = '0xd3d5f29881ad87bb10c1100e2c709c9596de345f'::text);
