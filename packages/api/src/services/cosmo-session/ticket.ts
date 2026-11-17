import { countWrongCode, type PollState } from "../../lib/cosmo-qr";
import { redis, redisFailOpen } from "../redis";

/** What the server issued to one user: the ticket never comes from the client. */
export type QrTicket = {
  ticket: string;
  /** epoch ms */
  expireAt: number;
  /** the last state a poll saw, for answers that skip Cosmo */
  last: PollState | null;
  /** wrong codes sent so far; absent is 0 */
  wrong?: number;
};

const keyOf = (userId: string) => `cosmo-qr:${userId}`;

const ttlSeconds = (expireAt: number, now = Date.now()) => Math.ceil((expireAt - now) / 1000);

async function readRaw(userId: string): Promise<{ raw: string | null } | null> {
  return redisFailOpen("cosmo qr", async () => ({ raw: await redis.get(keyOf(userId)) }));
}

function parse(raw: string): QrTicket | null {
  try {
    return JSON.parse(raw) as QrTicket;
  } catch {
    return null;
  }
}

/**
 * The stored ticket, none, or `unavailable` when Redis cannot be read. Fails closed, as
 * `cosmo-verify.ts` does: nothing reaches Cosmo without a store to hold its ticket.
 */
export async function readTicket(userId: string): Promise<QrTicket | "none" | "unavailable"> {
  const read = await readRaw(userId);
  if (read === null) return "unavailable";
  return (read.raw && parse(read.raw)) || "none";
}

/** Keeps the ticket until `expireAt` at most; false when Redis is unreachable or the ticket has run out. */
export async function storeTicket(userId: string, data: QrTicket) {
  const ttl = ttlSeconds(data.expireAt);
  if (ttl <= 0) return false;
  const stored = await redisFailOpen("cosmo qr", () =>
    redis.set(keyOf(userId), JSON.stringify(data), "EX", ttl),
  );
  return stored !== null;
}

// Both run as one script, so nothing lands between the compare and the write. Swap writes only
// over the exact value that was read; clear compares only the ticket, so a poll's write that
// races a certify can never keep a finished ticket alive.
const SWAP_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  redis.call("SET", KEYS[1], ARGV[2], "KEEPTTL")
  return 1
end
return 0
`;
const CLEAR_SCRIPT = `
local raw = redis.call("GET", KEYS[1])
if not raw then return 0 end
local ok, t = pcall(cjson.decode, raw)
if ok and type(t) == "table" and t.ticket == ARGV[1] then return redis.call("DEL", KEYS[1]) end
return 0
`;

const SWAP_TRIES = 3;

/**
 * Rewrites the stored ticket if it is still `ticket`, without extending its life. Retries when
 * another writer changed it in between. `gone` when it was replaced or ended, `unavailable` when
 * Redis cannot be reached (or kept losing the race).
 */
async function updateTicket(
  userId: string,
  ticket: string,
  change: (current: QrTicket) => QrTicket,
): Promise<QrTicket | "gone" | "unavailable"> {
  for (let attempt = 0; attempt < SWAP_TRIES; attempt++) {
    const read = await readRaw(userId);
    if (read === null) return "unavailable";
    const current = read.raw ? parse(read.raw) : null;
    if (!read.raw || !current || current.ticket !== ticket) return "gone";
    const next = change(current);
    const swapped = await redisFailOpen("cosmo qr", () =>
      redis.send("EVAL", [SWAP_SCRIPT, "1", keyOf(userId), read.raw!, JSON.stringify(next)]),
    );
    if (swapped === null) return "unavailable";
    if (Number(swapped) === 1) return next;
  }
  return "unavailable";
}

/**
 * Writes the poll's state back without extending the ticket's life. Skipped when a newer
 * `qrStart` replaced the ticket since it was read, so a slow poll never clobbers it.
 */
export async function rememberState(userId: string, read: QrTicket, last: PollState) {
  await updateTicket(userId, read.ticket, (current) => ({ ...current, last }));
}

/**
 * Counts one wrong code on the ticket. `over` when it was the last one allowed (the ticket is
 * deleted), `gone` when the ticket is no longer this one.
 */
export async function recordWrongCode(
  userId: string,
  ticket: string,
): Promise<"counted" | "over" | "gone" | "unavailable"> {
  let over = false;
  const result = await updateTicket(userId, ticket, (current) => {
    const counted = countWrongCode(current);
    over = counted.over;
    return { ...current, wrong: counted.wrong };
  });
  if (result === "gone" || result === "unavailable") return result;
  if (!over) return "counted";
  await clearTicket(userId, ticket);
  return "over";
}

/** Deletes the ticket only if it is still this one. */
export async function clearTicket(userId: string, ticket?: string) {
  if (ticket) {
    await redisFailOpen("cosmo qr", () =>
      redis.send("EVAL", [CLEAR_SCRIPT, "1", keyOf(userId), ticket]),
    );
    return;
  }
  await redisFailOpen("cosmo qr", () => redis.del(keyOf(userId)));
}
