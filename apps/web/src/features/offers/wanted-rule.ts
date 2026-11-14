import type { QueryClient } from "@tanstack/react-query";

import { toastManager } from "@/components/ui/toast";
import { addActionToast } from "@/lib/action-toast";
import { client } from "@/lib/orpc";
import { m } from "@/paraglide/messages";
import { useNoticesStore } from "@/stores/notices";

import { WANTED_RULE_NUDGE } from "./decline-nudge";

/** Saves Only offers with what I want, then refreshes every query that read the account. */
async function turnOnWantedRule(queryClient: QueryClient) {
  try {
    await client.user.setOfferRules({ onlyWantedOffers: true });
    await queryClient.invalidateQueries();
    toastManager.add({ type: "success", title: m.offer_rule_wanted_on() });
  } catch {
    toastManager.add({ type: "error", title: m.offer_rule_wanted_on_error() });
  }
}

/** After declining an offer with an unwanted give: offer the rule, once in this browser. */
export function nudgeWantedRule(queryClient: QueryClient) {
  const notices = useNoticesStore.getState();
  if (notices.dismissed.includes(WANTED_RULE_NUDGE)) return;
  notices.dismiss(WANTED_RULE_NUDGE);
  addActionToast(
    {
      title: m.offer_nudge_wanted_title(),
      description: m.offer_nudge_wanted_desc(),
      timeout: 12_000,
    },
    { label: m.offer_rule_turn_on(), onClick: () => void turnOnWantedRule(queryClient) },
  );
}
