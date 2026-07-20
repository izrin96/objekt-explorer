import type { QueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc/client";

/**
 * Reassigns order values for the pins.list cache entries matching `tokenIds`,
 * following the given display order (topmost first). Assigns brand-new,
 * strictly distinct dense order values derived purely from target position
 * (topmost gets the biggest value) — mirrors the server's `reorderPins`
 * handler exactly, so the optimistic cache and the eventual server response
 * agree. This is self-healing: even if two pins previously shared an order
 * value, this never reuses/permutes the old (possibly tied) values, so the
 * tie cannot persist. Idempotent — safe to call repeatedly with the same or
 * a stale-but-consistent order.
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

    const cachedIds = new Set(targeted.map((p) => p.tokenId));
    const orderedTokenIds = tokenIds.map(String).filter((id) => cachedIds.has(id));

    const total = orderedTokenIds.length;
    const orderByTokenId = new Map<string, number>();
    for (let i = 0; i < orderedTokenIds.length; i++) {
      orderByTokenId.set(orderedTokenIds[i]!, total - i);
    }

    return old.map((item) => {
      const newOrder = orderByTokenId.get(item.tokenId);
      if (newOrder === undefined) return item;
      return Object.assign({}, item, { order: newOrder });
    });
  });
}
