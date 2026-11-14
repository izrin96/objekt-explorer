import type { QueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { addActionToast } from "@/lib/action-toast";
import { client } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { useNoticesStore } from "@/stores/notices";

import { ONE_POST_NUDGE } from "./decline-nudge";

/** Saves Let people ask from more than one post off, then refreshes every query that read the account. */
async function turnOffMultiPostAsks(queryClient: QueryClient) {
  try {
    await client.user.setOfferRules({ multiPostAsks: false });
    await queryClient.invalidateQueries();
    toastManager.add({ type: "success", title: m.offer_rule_multi_post_off() });
  } catch {
    toastManager.add({ type: "error", title: m.offer_rule_multi_post_off_error() });
  }
}

/** After declining an offer that asked across posts: offer one post per offer, once in this browser. */
export function nudgeOnePostRule(queryClient: QueryClient) {
  const notices = useNoticesStore.getState();
  if (notices.dismissed.includes(ONE_POST_NUDGE)) return;
  notices.dismiss(ONE_POST_NUDGE);
  addActionToast(
    {
      title: m.offer_nudge_one_post_title(),
      description: m.offer_nudge_one_post_desc(),
      timeout: 12_000,
    },
    { label: m.offer_rule_turn_off(), onClick: () => void turnOffMultiPostAsks(queryClient) },
  );
}
