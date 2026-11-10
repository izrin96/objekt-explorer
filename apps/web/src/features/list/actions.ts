import { partialMatchKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { toastManager } from "@/components/ui/toast";
import { currentUserOptions } from "@/features/user/queries";
import { formatCount } from "@/lib/number";
import { orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

import { LIST_QUERY_KEY } from "./queries";

/**
 * A list's identity lives in `currentUser`, in both of its addresses, in the
 * edit form's `find` and in the profile it is filed under, and its entries in
 * their own key, the cards' previews, the trade matches and Market, so every write
 * settles all of them.
 */
function useListInvalidation() {
  const queryClient = useQueryClient();

  /**
   * `deleted`: the list's own reads go stale without a refetch. Its page stays mounted until the
   * delete dialog navigates away, and each of them would come back a 404.
   */
  return (slug?: string, { deleted = false }: { deleted?: boolean } = {}) => {
    const own = deleted ? ("none" as const) : undefined;
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey }),
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY, refetchType: own }),
      queryClient.invalidateQueries({ queryKey: orpc.trade.key() }),
      // Market lists sale entries and their prices
      queryClient.invalidateQueries({ queryKey: orpc.market.key() }),
      ...(slug !== undefined
        ? [
            queryClient.invalidateQueries({
              queryKey: orpc.list.listEntries.key({ input: { slug } }),
              refetchType: own,
            }),
            // refetched while the dialog is still open, so the next open seeds from the saved list
            queryClient.invalidateQueries({
              queryKey: orpc.list.find.key({ input: { slug } }),
              refetchType: own,
            }),
            ...(deleted
              ? [
                  queryClient.invalidateQueries({
                    queryKey: orpc.list.rules.key({ input: { slug } }),
                    refetchType: own,
                  }),
                  queryClient.invalidateQueries({
                    queryKey: orpc.list.ruleObjekts.key({ input: { slug } }),
                    refetchType: own,
                  }),
                ]
              : []),
            queryClient.invalidateQueries({ queryKey: orpc.list.listPreviews.key() }),
            queryClient.invalidateQueries({ queryKey: orpc.list.profileLists.key() }),
          ]
        : [
            queryClient.invalidateQueries({
              queryKey: orpc.list.key(),
              // a save changes nothing a copy preview reads, and one is still mounted with its dialog
              predicate: (query) => !partialMatchKey(query.queryKey, orpc.list.copyPreview.key()),
            }),
          ]),
    ]);
  };
}

export function useCreateList() {
  const invalidate = useListInvalidation();

  return useMutation(
    orpc.list.create.mutationOptions({
      onSuccess: async () => {
        toastManager.add({ type: "success", title: m.list_create_success() });
        await invalidate();
      },
      onError: (error) => {
        toastManager.add({
          type: "error",
          title: m.list_create_error(),
          description: refusalText(error),
        });
      },
    }),
  );
}

/** `opensCopy: false` for a caller that takes the copy itself; the post composer picks it */
export function useCopyList({ opensCopy = true }: { opensCopy?: boolean } = {}) {
  const invalidate = useListInvalidation();
  const navigate = useNavigate();

  return useMutation(
    orpc.list.copy.mutationOptions({
      onSuccess: async ({ slug, carried, leftOut, unit }) => {
        const counts = {
          carried: formatCount(carried),
          leftOut: formatCount(leftOut),
        };
        toastManager.add({
          type: "success",
          title:
            unit === "copies"
              ? m.list_copy_success_copies(counts)
              : m.list_copy_success_collections(counts),
        });
        await invalidate();
        if (opensCopy) await navigate({ to: "/list/$slug", params: { slug } });
      },
      onError: (error) => {
        toastManager.add({
          type: "error",
          title: m.list_copy_error(),
          description: refusalText(error),
        });
      },
    }),
  );
}

/** `successTitle`: the toast, for a caller that changes one thing (Ratio for all) */
export function useEditList(successTitle: () => string = m.list_edit_success) {
  const invalidate = useListInvalidation();

  return useMutation(
    orpc.list.edit.mutationOptions({
      onSuccess: async (_data, { slug }) => {
        toastManager.add({ type: "success", title: successTitle() });
        await invalidate(slug);
      },
      onError: (error) => {
        toastManager.add({
          type: "error",
          title: m.list_edit_error(),
          description: refusalText(error),
        });
      },
    }),
  );
}

export function useDeleteList() {
  const invalidate = useListInvalidation();

  return useMutation(
    orpc.list.delete.mutationOptions({
      onSuccess: async (_data, { slug }) => {
        toastManager.add({ type: "success", title: m.list_delete_success() });
        await invalidate(slug, { deleted: true });
      },
      onError: (error) => {
        toastManager.add({
          type: "error",
          title: m.list_delete_error(),
          description: refusalText(error),
        });
      },
    }),
  );
}

/**
 * Drops a deleted list's reads once its page is gone. Invalidated, they would stay cached, and the
 * list routes' static loader read would serve the deleted list again on Back.
 */
export function useForgetDeletedList() {
  const queryClient = useQueryClient();

  return (slug: string) => {
    // both of its addresses, the profile-scoped one keyed by `profileSlug`
    queryClient.removeQueries({
      queryKey: LIST_QUERY_KEY,
      predicate: (query) => (query.state.data as { slug?: unknown } | undefined)?.slug === slug,
    });
    for (const key of [
      orpc.list.listEntries.key({ input: { slug } }),
      orpc.list.find.key({ input: { slug } }),
      orpc.list.rules.key({ input: { slug } }),
      orpc.list.ruleObjekts.key({ input: { slug } }),
    ]) {
      queryClient.removeQueries({ queryKey: key });
    }
  };
}

/** The caller reports the outcome: only it knows how many objekts it asked for. */
export function useAddToList() {
  const invalidate = useListInvalidation();

  return useMutation(
    orpc.list.addToList.mutationOptions({
      onSuccess: async (_result, { slug }) => {
        await invalidate(slug);
      },
      onError: (error) => {
        toastManager.add({
          type: "error",
          title: m.actions_add_to_list_error(),
          description: refusalText(error),
        });
      },
    }),
  );
}

export function useRemoveObjektsFromList() {
  const invalidate = useListInvalidation();

  return useMutation(
    orpc.list.removeObjektsFromList.mutationOptions({
      onSuccess: async ({ removed }, { slug }) => {
        toastManager.add({
          type: "success",
          title:
            removed === 1
              ? m.actions_remove_from_list_success_one()
              : m.actions_remove_from_list_success_multiple({
                  count: formatCount(removed),
                }),
        });
        await invalidate(slug);
      },
      onError: (error) => {
        toastManager.add({
          type: "error",
          title: m.actions_remove_from_list_error(),
          description: refusalText(error),
        });
      },
    }),
  );
}

export function useSetRatio() {
  const invalidate = useListInvalidation();

  return useMutation(
    orpc.list.setRatio.mutationOptions({
      onSuccess: async (_data, { slug }) => {
        toastManager.add({ type: "success", title: m.ratio_set_success() });
        await invalidate(slug);
      },
      onError: (error) => {
        toastManager.add({
          type: "error",
          title: m.ratio_set_error(),
          description: refusalText(error),
        });
      },
    }),
  );
}

export function useUpdateEntryPrices() {
  const invalidate = useListInvalidation();

  return useMutation(
    orpc.list.updateEntryPrices.mutationOptions({
      onSuccess: async (_data, { slug }) => {
        toastManager.add({ type: "success", title: m.list_manage_objekt_set_price_success() });
        await invalidate(slug);
      },
      onError: (error) => {
        toastManager.add({
          type: "error",
          title: m.list_manage_objekt_set_price_error(),
          description: refusalText(error),
        });
      },
    }),
  );
}
