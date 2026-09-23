import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { currentUserOptions } from "@/features/user/queries";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

import { LIST_QUERY_KEY } from "./queries";

/**
 * A list's identity lives in `currentUser`, in both of its addresses and in
 * the edit form's `find`, and its entries in their own key, so every write
 * settles all of them.
 */
function useListInvalidation() {
  const queryClient = useQueryClient();

  return (slug?: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey }),
      queryClient.invalidateQueries({ queryKey: LIST_QUERY_KEY }),
      ...(slug !== undefined
        ? [
            queryClient.invalidateQueries({
              queryKey: orpc.list.listEntries.key({ input: { slug } }),
            }),
            // refetched while the dialog is still open, so the next open seeds from the saved list
            queryClient.invalidateQueries({ queryKey: orpc.list.find.key({ input: { slug } }) }),
          ]
        : [queryClient.invalidateQueries({ queryKey: orpc.list.key() })]),
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
      onError: ({ message }) => {
        toastManager.add({ type: "error", title: m.list_create_error(), description: message });
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
      onError: ({ message }) => {
        toastManager.add({ type: "error", title: m.list_edit_error(), description: message });
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
      onError: ({ message }) => {
        toastManager.add({ type: "error", title: m.list_delete_error(), description: message });
      },
    }),
  );
}

/** The caller reports the outcome: only it knows how many objekts it asked for. */
export function useAddObjektsToList() {
  const invalidate = useListInvalidation();

  return useMutation(
    orpc.list.addObjektsToList.mutationOptions({
      onSuccess: async (_rows, { slug }) => {
        await invalidate(slug);
      },
      onError: ({ message }) => {
        toastManager.add({
          type: "error",
          title: m.actions_add_to_list_error(),
          description: message,
        });
      },
    }),
  );
}

export function useRemoveObjektsFromList() {
  const invalidate = useListInvalidation();

  return useMutation(
    orpc.list.removeObjektsFromList.mutationOptions({
      onSuccess: async (_data, { slug, entryIds }) => {
        toastManager.add({
          type: "success",
          title: m.actions_remove_from_list_success_multiple({
            count: entryIds.length.toLocaleString(),
          }),
        });
        await invalidate(slug);
      },
      onError: ({ message }) => {
        toastManager.add({
          type: "error",
          title: m.actions_remove_from_list_error(),
          description: message,
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
      onError: ({ message }) => {
        toastManager.add({
          type: "error",
          title: m.list_manage_objekt_set_price_error(),
          description: message,
        });
      },
    }),
  );
}
