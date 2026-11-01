import { Pool } from "pg";

/**
 * A pg pool that survives a dropped idle connection: pg-pool emits `error` for it, and an
 * EventEmitter with no `error` listener throws, which ends the process.
 */
export function createPool(connectionString: string, name: string) {
  const pool = new Pool({
    connectionString,
    max: 10,
    // waiting for a free connection fails after this instead of hanging the request for good
    connectionTimeoutMillis: 30_000,
  });
  pool.on("error", (error) => {
    console.warn(`[db] ${name} idle connection dropped:`, error.message);
  });
  return pool;
}
