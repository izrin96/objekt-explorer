import * as z from "zod";

const envSchema = z.object({
  RPC_RATE_LIMIT: z.coerce.number().positive().default(2),
  RPC_FINALITY: z.coerce.number().positive().default(60),
  RPC_ENDPOINT: z.url(),
  SQD_ENDPOINT: z.url(),
  SQD_API_KEY: z.string(),
  ENABLE_OBJEKTS: z.preprocess((x) => x === "true", z.coerce.boolean()),
  ENABLE_GRAVITY: z.preprocess((x) => x === "true", z.coerce.boolean()),
  COSMO_PARALLEL_COUNT: z.coerce.number().positive().default(500),
  // diagnostic-only speed-up flags, not for production use
  SKIP_METADATA: z.preprocess((x) => x === "true", z.coerce.boolean()).default(false),
  SKIP_OUTBOX: z.preprocess((x) => x === "true", z.coerce.boolean()).default(false),
  // diagnostic-only: override the block the processor starts from.
  // empty string is treated as unset so docker-compose can always pass the var.
  START_BLOCK: z.preprocess(
    (x) => (x === "" || x === undefined ? undefined : x),
    z.coerce.number().nonnegative().default(6363806),
  ),
  DB_URL: z.url(),
  // legacy variables for backwards compatibility
  DB_NAME: z.string(),
  DB_READ_USER: z.string(),
  DB_READ_PASS: z.string(),
  REDIS_URL: z.string(),
});

export const env = envSchema.parse(process.env);
