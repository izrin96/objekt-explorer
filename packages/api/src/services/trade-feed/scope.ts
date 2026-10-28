import type { PeopleOrder } from "../../lib/trade-feed";
import { redis, redisFailOpen } from "../redis";

const ORDER_TTL_SECONDS = 3600;

const orderKey = (viewerId: string | null, token: string) =>
  `trade:people-order:3:${viewerId ?? "anon"}:${token}`;

type StoredOrder = PeopleOrder & { v: 1; filters: string };

/**
 * A new order's token: a hash of the order, so a reader who opens the same order again (a
 * reload, a second tab, or any signed-out reader) shares its key instead of storing a copy.
 * The key's viewer keeps one viewer's order from another's.
 */
export function orderToken(filters: string, order: PeopleOrder) {
  return new Bun.CryptoHasher("sha1")
    .update(JSON.stringify({ filters, order }))
    .digest("hex")
    .slice(0, 24);
}

/** An order that expired, can't be read, or was built for other filters reads as none. */
export async function loadPeopleOrder(
  viewerId: string | null,
  token: string,
  filters: string,
): Promise<PeopleOrder | undefined> {
  const stored = await redisFailOpen("trade people order", () =>
    redis.get(orderKey(viewerId, token)),
  );
  if (!stored) return undefined;
  try {
    const order = JSON.parse(stored) as StoredOrder;
    if (order.v !== 1 || order.filters !== filters || !Array.isArray(order.people)) {
      return undefined;
    }
    return { people: order.people, more: order.more };
  } catch {
    return undefined;
  }
}

/** a cursor whose order is gone rebuilds it, so a failed save is let go */
export async function savePeopleOrder(
  viewerId: string | null,
  token: string,
  filters: string,
  order: PeopleOrder,
) {
  const stored: StoredOrder = { v: 1, filters, ...order };
  await redisFailOpen("trade people order", () =>
    redis.set(orderKey(viewerId, token), JSON.stringify(stored), "EX", ORDER_TTL_SECONDS),
  );
}
