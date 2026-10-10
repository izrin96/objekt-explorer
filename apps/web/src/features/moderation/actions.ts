import { REPORT_AFTER_DAYS } from "@repo/api/schemas/offer";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { LIST_QUERY_KEY } from "@/features/list/queries";
import { PROFILE_PAGE_KEY } from "@/features/profile/queries";
import { addActionToast } from "@/lib/action-toast";
import { orpc } from "@/lib/orpc";
import { errorReason } from "@/lib/orpc-error";
import { relativeTime } from "@/lib/time";
import { m } from "@/paraglide/messages";

/** A block reaches chat lists, Trade, For you, Market rows' Message, profiles and list pages. */
function useBlockInvalidation() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      [
        orpc.chat.key(),
        orpc.trade.key(),
        orpc.market.key(),
        orpc.moderation.blocked.key(),
        PROFILE_PAGE_KEY,
        LIST_QUERY_KEY,
      ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
}

export function useUnblock() {
  const invalidate = useBlockInvalidation();
  return useMutation(
    orpc.moderation.unblock.mutationOptions({
      onSuccess: () => invalidate(),
      onError: ({ message }) =>
        toastManager.add({ type: "error", title: m.mod_unblock_error(), description: message }),
    }),
  );
}

/**
 * The blocked account's row may have just unmounted, taking the focused control with it;
 * the page heading is then the nearest sensible place to continue from.
 */
const FOCUS_SETTLE_MS = 400;

function keepFocus() {
  if (document.activeElement && document.activeElement !== document.body) return;
  const target = document.querySelector<HTMLElement>("main h1") ?? document.querySelector("main");
  if (!target) return;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

/** Blocks once the user has confirmed, with an undo in the toast. */
export function useBlock() {
  const invalidate = useBlockInvalidation();
  const unblock = useUnblock();
  const mutation = useMutation(
    orpc.moderation.block.mutationOptions({
      onSuccess: () => invalidate(),
      onError: ({ message }) =>
        toastManager.add({ type: "error", title: m.mod_block_error(), description: message }),
    }),
  );
  // mutateAsync, not per-call callbacks: the blocked row unmounts once the lists refetch,
  // and TanStack drops a per-call onSuccess whose observer is gone
  const block = (userId: string, name: string) =>
    mutation.mutateAsync({ userId }).then(
      () => {
        // after the confirm dialog has closed and handed focus back to a trigger that may
        // be in the row React is about to drop
        setTimeout(keepFocus, FOCUS_SETTLE_MS);
        addActionToast(
          { type: "success", title: m.mod_block_success({ name }) },
          { label: m.common_actions_undo(), onClick: () => unblock.mutate({ userId }) },
        );
      },
      // the options-level onError already said so
      () => undefined,
    );
  return { block, isPending: mutation.isPending };
}

/** A report the server refused, worded; null for any other error. */
export function reportRefusal(error: unknown) {
  const { reason, retryAt } = errorReason(error);
  if (reason === "not_reportable") return m.mod_report_not_reportable({ days: REPORT_AFTER_DAYS });
  if (reason !== "report_limit") return null;
  const at = retryAt ? new Date(retryAt).getTime() : Date.now();
  return m.mod_report_limit({ time: relativeTime(at, Date.now(), "hour") });
}

export function useReport({ onDone }: { onDone: () => void }) {
  const invalidate = useBlockInvalidation();
  const unblock = useUnblock();
  return useMutation(
    orpc.moderation.report.mutationOptions({
      onSuccess: (_data, { alsoBlock, userId }) => {
        if (alsoBlock) void invalidate();
        if (alsoBlock) {
          // the report stays; only the block can be taken back
          addActionToast(
            { type: "success", title: m.mod_report_success_blocked() },
            { label: m.mod_unblock(), onClick: () => unblock.mutate({ userId }) },
          );
        } else {
          toastManager.add({ type: "success", title: m.mod_report_success() });
        }
        onDone();
      },
    }),
  );
}
