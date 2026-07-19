import type { QueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

/**
 * Reassigns order values for the pins.list cache entries matching `tokenIds`,
 * following the given display order (topmost first). Pool of existing order
 * values (for the targeted ids only) is sorted descending and handed out in
 * sequence, so no collision with pins outside the targeted set. Idempotent —
 * safe to call repeatedly with the same or a stale-but-consistent order.
 */
export function applyPinOrderToCache(
  client: QueryClient,
  address: string,
  tokenIds: (number | string)[],
) {
  const queryKey = orpc.pins.list.queryKey({ input: address });

  client.setQueryData(queryKey, (old = []) => {
    const targetIds = new Set(tokenIds.map(String));
    const targeted = old.filter((p) => targetIds.has(p.tokenId));
    if (targeted.length < 2) return old;

    const pool = targeted.map((p) => p.order).toSorted((a, b) => b - a);

    const cachedIds = new Set(targeted.map((p) => p.tokenId));
    const orderedTokenIds = tokenIds.map(String).filter((id) => cachedIds.has(id));

    const orderByTokenId = new Map<string, number>();
    for (let i = 0; i < orderedTokenIds.length; i++) {
      orderByTokenId.set(orderedTokenIds[i]!, pool[i]!);
    }

    return old.map((item) => {
      const newOrder = orderByTokenId.get(item.tokenId);
      if (newOrder === undefined) return item;
      return Object.assign({}, item, { order: newOrder });
    });
  });
}
