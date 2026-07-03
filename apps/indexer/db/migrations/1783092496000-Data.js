// Add transferability_update table: an append-only audit log of every
// batchUpdateObjektTransferability call seen. Previously these updates were
// applied ephemerally straight to objekt.transferable and silently dropped
// (only logged as an error) when the objekt row didn't exist yet, losing the
// data permanently. Now every update is persisted with appliedAt = null when
// pending, so it can be applied later once the objekt shows up.
module.exports = class Data1783092496000 {
  name = "Data1783092496000";

  async up(db) {
    await db.query(`
      CREATE TABLE "transferability_update" (
        "id" varchar(36) NOT NULL,
        "token_id" text NOT NULL,
        "transferable" boolean NOT NULL,
        "block_number" integer NOT NULL,
        "transaction_index" integer NOT NULL,
        "hash" text NOT NULL,
        "applied_at" TIMESTAMP WITH TIME ZONE,
        CONSTRAINT "PK_transferability_update" PRIMARY KEY ("id")
      );
    `);
    await db.query(
      `CREATE INDEX "idx_transferability_update_token_id" ON "transferability_update" ("token_id");`,
    );
    await db.query(
      `CREATE INDEX "idx_transferability_update_block_number" ON "transferability_update" ("block_number");`,
    );
    await db.query(
      `CREATE INDEX "idx_transferability_update_applied_at" ON "transferability_update" ("applied_at");`,
    );
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS "idx_transferability_update_applied_at";`);
    await db.query(`DROP INDEX IF EXISTS "idx_transferability_update_block_number";`);
    await db.query(`DROP INDEX IF EXISTS "idx_transferability_update_token_id";`);
    await db.query(`DROP TABLE IF EXISTS "transferability_update";`);
  }
};
