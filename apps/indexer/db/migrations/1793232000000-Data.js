// Transfers of a token whose metadata could not be fetched wait here until the
// worker replays them, instead of being filed under a placeholder collection.
module.exports = class Data1793232000000 {
  name = "Data1793232000000";

  async up(db) {
    await db.query(`
      CREATE TABLE "pending_transfer" (
        "id" varchar(36) NOT NULL,
        "token_id" text NOT NULL,
        "from" text NOT NULL,
        "to" text NOT NULL,
        "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL,
        "hash" text NOT NULL,
        "block_number" integer NOT NULL,
        "log_index" integer NOT NULL,
        CONSTRAINT "PK_pending_transfer" PRIMARY KEY ("id")
      );
    `);
    await db.query(
      `CREATE INDEX "idx_pending_transfer_token_id" ON "pending_transfer" ("token_id");`,
    );
  }

  async down(db) {
    await db.query(`DROP INDEX IF EXISTS "idx_pending_transfer_token_id";`);
    await db.query(`DROP TABLE IF EXISTS "pending_transfer";`);
  }
};
