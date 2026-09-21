import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

const pinsKey = (address: string) => orpc.pins.list.queryKey({ input: address });
const locksKey = (address: string) => orpc.lockedObjekt.list.queryKey({ input: address });

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

export function useBatchPin(address: string) {
  const client = useQueryClient();
  const queryKey = pinsKey(address);

  return useMutation(
    orpc.pins.batchPin.mutationOptions({
      onMutate: async ({ tokenIds }) => {
        await client.cancelQueries({ queryKey });
        const snapshot = client.getQueryData(queryKey);
        client.setQueryData(queryKey, (old = []) => {
          const added = new Set(tokenIds.map(String));
          return [
            ...tokenIds.map((tokenId, index) => ({
              tokenId: String(tokenId),
              order: Date.now() + index,
            })),
            ...old.filter((pin) => !added.has(pin.tokenId)),
          ];
        });
        return { snapshot };
      },
      onSuccess: (_data, { tokenIds }) =>
        toastManager.add({
          type: "success",
          title: plural(
            tokenIds.length,
            m.actions_pin_success_single,
            m.actions_pin_success_multiple,
          ),
        }),
      onError: async (_error, { tokenIds }, context) => {
        await rollback(client, queryKey, context?.snapshot);
        toastManager.add({
          type: "error",
          title: plural(tokenIds.length, m.actions_pin_error_single, m.actions_pin_error_multiple),
        });
      },
      onSettled: () => client.invalidateQueries({ queryKey }),
    }),
  );
}

export function useBatchUnpin(address: string) {
  const client = useQueryClient();
  const queryKey = pinsKey(address);

  return useMutation(
    orpc.pins.batchUnpin.mutationOptions({
      onMutate: async ({ tokenIds }) => {
        await client.cancelQueries({ queryKey });
        const snapshot = client.getQueryData(queryKey);
        const removed = new Set(tokenIds.map(String));
        client.setQueryData(queryKey, (old = []) => old.filter((pin) => !removed.has(pin.tokenId)));
        return { snapshot };
      },
      onSuccess: (_data, { tokenIds }) =>
        toastManager.add({
          type: "success",
          title: plural(
            tokenIds.length,
            m.actions_unpin_success_single,
            m.actions_unpin_success_multiple,
          ),
        }),
      onError: async (_error, { tokenIds }, context) => {
        await rollback(client, queryKey, context?.snapshot);
        toastManager.add({
          type: "error",
          title: plural(
            tokenIds.length,
            m.actions_unpin_error_single,
            m.actions_unpin_error_multiple,
          ),
        });
      },
      onSettled: () => client.invalidateQueries({ queryKey }),
    }),
  );
}

export function useReorderPins(address: string) {
  const client = useQueryClient();
  const queryKey = pinsKey(address);

  return useMutation(
    orpc.pins.reorderPins.mutationOptions({
      onMutate: async ({ tokenIds }) => {
        await client.cancelQueries({ queryKey });
        const snapshot = client.getQueryData(queryKey);
        const order = pinOrderFor(tokenIds.map(String));
        client.setQueryData(queryKey, (old = []) =>
          old.map((pin) => {
            const next = order.get(pin.tokenId);
            return next === undefined ? pin : { tokenId: pin.tokenId, order: next };
          }),
        );
        return { snapshot };
      },
      onError: async (_error, _input, context) => {
        await rollback(client, queryKey, context?.snapshot);
        toastManager.add({ type: "error", title: m.actions_move_pin_error() });
      },
      onSettled: () => client.invalidateQueries({ queryKey }),
    }),
  );
}

export function useBatchLock(address: string) {
  const client = useQueryClient();
  const queryKey = locksKey(address);

  return useMutation(
    orpc.lockedObjekt.batchLock.mutationOptions({
      onMutate: async ({ tokenIds }) => {
        await client.cancelQueries({ queryKey });
        const snapshot = client.getQueryData(queryKey);
        client.setQueryData(queryKey, (old = []) => {
          const added = new Set(tokenIds.map(String));
          return [
            ...tokenIds.map((tokenId) => ({ tokenId: String(tokenId) })),
            ...old.filter((lock) => !added.has(lock.tokenId)),
          ];
        });
        return { snapshot };
      },
      onSuccess: (_data, { tokenIds }) =>
        toastManager.add({
          type: "success",
          title: plural(
            tokenIds.length,
            m.actions_lock_success_single,
            m.actions_lock_success_multiple,
          ),
        }),
      onError: async (_error, { tokenIds }, context) => {
        await rollback(client, queryKey, context?.snapshot);
        toastManager.add({
          type: "error",
          title: plural(
            tokenIds.length,
            m.actions_lock_error_single,
            m.actions_lock_error_multiple,
          ),
        });
      },
      onSettled: () => client.invalidateQueries({ queryKey }),
    }),
  );
}

export function useBatchUnlock(address: string) {
  const client = useQueryClient();
  const queryKey = locksKey(address);

  return useMutation(
    orpc.lockedObjekt.batchUnlock.mutationOptions({
      onMutate: async ({ tokenIds }) => {
        await client.cancelQueries({ queryKey });
        const snapshot = client.getQueryData(queryKey);
        const removed = new Set(tokenIds.map(String));
        client.setQueryData(queryKey, (old = []) =>
          old.filter((lock) => !removed.has(lock.tokenId)),
        );
        return { snapshot };
      },
      onSuccess: (_data, { tokenIds }) =>
        toastManager.add({
          type: "success",
          title: plural(
            tokenIds.length,
            m.actions_unlock_success_single,
            m.actions_unlock_success_multiple,
          ),
        }),
      onError: async (_error, { tokenIds }, context) => {
        await rollback(client, queryKey, context?.snapshot);
        toastManager.add({
          type: "error",
          title: plural(
            tokenIds.length,
            m.actions_unlock_error_single,
            m.actions_unlock_error_multiple,
          ),
        });
      },
      onSettled: () => client.invalidateQueries({ queryKey }),
    }),
  );
}
