import type { DataTag, QueryClient, QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

const pinsKey = (address: string) => orpc.pins.list.queryKey({ input: { address } });
const locksKey = (address: string) => orpc.lockedObjekt.list.queryKey({ input: { address } });

function plural(count: number, single: () => string, multiple: (n: { count: string }) => string) {
  return count > 1 ? multiple({ count: count.toLocaleString() }) : single();
}

/**
 * Restores the list a failed mutation had optimistically rewritten. Without a
 * snapshot the cache is refetched instead, so the grid never keeps a mark the
 * server rejected.
 */
async function rollback(client: QueryClient, queryKey: QueryKey, snapshot: unknown) {
  if (snapshot !== undefined) client.setQueryData(queryKey, snapshot);
  else await client.invalidateQueries({ queryKey });
}

/**
 * Dense, strictly distinct order values from target position alone — topmost
 * gets the biggest, which is what the server's `reorderPins` writes. Deriving
 * them rather than permuting the old ones heals a tie two concurrent reorders
 * could have left behind.
 */
export function pinOrderFor(tokenIds: readonly string[]): Map<string, number> {
  const total = tokenIds.length;
  return new Map(tokenIds.map((tokenId, index) => [tokenId, total - index]));
}

type Plural = [single: () => string, multiple: (n: { count: string }) => string];

/**
 * The lifecycle every pin and lock mutation shares: rewrite the cached list
 * before the request, restore it and toast if the server rejects, and refetch
 * once it settles either way.
 */
function optimisticTokens<T, TError>(
  client: QueryClient,
  queryKey: DataTag<QueryKey, T[], TError>,
  update: (old: T[], tokenIds: string[]) => T[],
  toasts: { success?: Plural; error: Plural | (() => string) },
) {
  const errorTitle = (count: number) =>
    typeof toasts.error === "function" ? toasts.error() : plural(count, ...toasts.error);

  return {
    onMutate: async ({ tokenIds }: { tokenIds: number[] }) => {
      await client.cancelQueries({ queryKey });
      const snapshot = client.getQueryData(queryKey);
      client.setQueryData(queryKey, (old = []) => update(old, tokenIds.map(String)));
      return { snapshot };
    },
    onSuccess: (_data: unknown, { tokenIds }: { tokenIds: number[] }) => {
      if (toasts.success) {
        toastManager.add({ type: "success", title: plural(tokenIds.length, ...toasts.success) });
      }
    },
    onError: async (
      _error: unknown,
      { tokenIds }: { tokenIds: number[] },
      context: { snapshot: T[] | undefined } | undefined,
    ) => {
      await rollback(client, queryKey, context?.snapshot);
      toastManager.add({ type: "error", title: errorTitle(tokenIds.length) });
    },
    onSettled: () => client.invalidateQueries({ queryKey }),
  };
}

/** new tokens go first, replacing any copy already in the list */
function prepend<T extends { tokenId: string }>(old: T[], added: T[]) {
  const ids = new Set(added.map((item) => item.tokenId));
  return [...added, ...old.filter((item) => !ids.has(item.tokenId))];
}

function without<T extends { tokenId: string }>(old: T[], tokenIds: string[]) {
  const removed = new Set(tokenIds);
  return old.filter((item) => !removed.has(item.tokenId));
}

export function useBatchPin(address: string) {
  const client = useQueryClient();
  return useMutation(
    orpc.pins.batchPin.mutationOptions(
      optimisticTokens(
        client,
        pinsKey(address),
        (old, tokenIds) =>
          prepend(
            old,
            tokenIds.map((tokenId, index) => ({ tokenId, order: Date.now() + index })),
          ),
        {
          success: [m.actions_pin_success_single, m.actions_pin_success_multiple],
          error: [m.actions_pin_error_single, m.actions_pin_error_multiple],
        },
      ),
    ),
  );
}

export function useBatchUnpin(address: string) {
  const client = useQueryClient();
  return useMutation(
    orpc.pins.batchUnpin.mutationOptions(
      optimisticTokens(client, pinsKey(address), without, {
        success: [m.actions_unpin_success_single, m.actions_unpin_success_multiple],
        error: [m.actions_unpin_error_single, m.actions_unpin_error_multiple],
      }),
    ),
  );
}

export function useReorderPins(address: string) {
  const client = useQueryClient();
  return useMutation(
    orpc.pins.reorderPins.mutationOptions(
      optimisticTokens(
        client,
        pinsKey(address),
        (old, tokenIds) => {
          const order = pinOrderFor(tokenIds);
          return old.map((pin) => {
            const next = order.get(pin.tokenId);
            return next === undefined ? pin : { tokenId: pin.tokenId, order: next };
          });
        },
        { error: m.actions_move_pin_error },
      ),
    ),
  );
}

export function useBatchLock(address: string) {
  const client = useQueryClient();
  return useMutation(
    orpc.lockedObjekt.batchLock.mutationOptions(
      optimisticTokens(
        client,
        locksKey(address),
        (old, tokenIds) =>
          prepend(
            old,
            tokenIds.map((tokenId) => ({ tokenId })),
          ),
        {
          success: [m.actions_lock_success_single, m.actions_lock_success_multiple],
          error: [m.actions_lock_error_single, m.actions_lock_error_multiple],
        },
      ),
    ),
  );
}

export function useBatchUnlock(address: string) {
  const client = useQueryClient();
  return useMutation(
    orpc.lockedObjekt.batchUnlock.mutationOptions(
      optimisticTokens(client, locksKey(address), without, {
        success: [m.actions_unlock_success_single, m.actions_unlock_success_multiple],
        error: [m.actions_unlock_error_single, m.actions_unlock_error_multiple],
      }),
    ),
  );
}
