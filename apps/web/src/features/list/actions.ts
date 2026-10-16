import { partialMatchKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { toastManager } from "@/components/ui/toast";
import { currentUserOptions } from "@/features/user/queries";
import { orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

import { LIST_QUERY_KEY } from "./queries";

/**
 * A list's identity lives in `currentUser`, in both of its addresses, in the
 * edit form's `find` and in the profile it is filed under, and its entries in
 * their own key, the cards' previews and the trade matches, so every write
 * settles all of them.
 */
function useListInvalidation() {
  const queryClient = useQueryClient();

  return (slug?: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey }),
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: orpc.trade.key() }),
      ...(slug !== undefined
        ? [
            queryClient.invalidateQueries({
              queryKey: orpc.list.listEntries.key({ input: { slug } }),
            }),
            // refetched while the dialog is still open, so the next open seeds from the saved list
            queryClient.invalidateQueries({ queryKey: orpc.list.find.key({ input: { slug } }) }),
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

export function useCopyList() {
  const invalidate = useListInvalidation();
  const navigate = useNavigate();

  return useMutation(
    orpc.list.copy.mutationOptions({
      onSuccess: async ({ slug, carried, leftOut, unit }) => {
        const counts = {
          carried: carried.toLocaleString(),
          leftOut: leftOut.toLocaleString(),
        };
        toastManager.add({
          type: "success",
          title:
            unit === "copies"
              ? m.list_copy_success_copies(counts)
              : m.list_copy_success_collections(counts),
        });
        await invalidate();
        await navigate({ to: "/list/$slug", params: { slug } });
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

export function useEditList() {
  const invalidate = useListInvalidation();

  return useMutation(
    orpc.list.edit.mutationOptions({
      onSuccess: async (_data, { slug }) => {
        toastManager.add({ type: "success", title: m.list_edit_success() });
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
        await invalidate(slug);
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
          title: m.actions_remove_from_list_success_multiple({
            count: removed.toLocaleString(),
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
