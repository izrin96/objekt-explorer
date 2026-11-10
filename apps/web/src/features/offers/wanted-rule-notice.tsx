import { InfoIcon } from "@phosphor-icons/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useHydrated } from "@tanstack/react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { currentUserOptions } from "@/features/user/queries";
import { m } from "@/paraglide/messages";
import { useNoticesStore } from "@/stores/notices";

import { WANTED_RULE_NOTICE, turnOnWantedRule } from "./wanted-rule";

/** Introduces Only offers with what I want, once, to someone it would filter for. */
export function WantedRuleNotice() {
  // the server cannot know what this browser dismissed, so nothing shows before hydration
  const hydrated = useHydrated();
  const answered = useNoticesStore((s) => s.dismissed.includes(WANTED_RULE_NOTICE));
  const dismiss = useNoticesStore((s) => s.dismiss);
  const queryClient = useQueryClient();
  const { data } = useQuery(currentUserOptions);
  const applies =
    data?.user.onlyWantedOffers === false &&
    data.lists.some((list) => list.listType === "want" && list.discoverable === true);
  if (!hydrated || answered || !applies) return null;

  return (
    <Alert
      variant="info"
      role="region"
      aria-label={m.offer_notice_wanted_title()}
      className="mx-3 mt-3 w-auto"
    >
      <InfoIcon />
      <AlertTitle>{m.offer_notice_wanted_title()}</AlertTitle>
      <AlertDescription>
        <p>{m.offer_notice_wanted_desc()}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="xs" onClick={() => void turnOnWantedRule(queryClient)}>
            {m.offer_rule_turn_on()}
          </Button>
          <Button size="xs" variant="outline" onClick={() => dismiss(WANTED_RULE_NOTICE)}>
            {m.offer_rule_not_now()}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
