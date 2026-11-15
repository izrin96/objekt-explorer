import type { User } from "@repo/api/services/account/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { toastManager } from "@/components/ui/toast";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

import { SwitchRow } from "./switch-row";

type OfferRule = "onlyWantedOffers" | "allowCollectionAsks";
// a column added after the session was read is unknown until then: its default stands in
const RULE_DEFAULTS: Record<OfferRule, boolean> = {
  onlyWantedOffers: false,
  allowCollectionAsks: false,
};

/** The offer rules; each switch saves on change, like Messages. */
export function TradeSection({ user }: { user: User }) {
  const queryClient = useQueryClient();
  // shown until the session read after the save catches up
  const [pending, setPending] = useState<Partial<Record<OfferRule, boolean>>>({});
  const rule = (key: OfferRule) => pending[key] ?? user[key] ?? RULE_DEFAULTS[key];

  const mutation = useMutation(
    orpc.user.setOfferRules.mutationOptions({
      onMutate: (input) => setPending((edits) => ({ ...edits, ...input })),
      onError: (_error, input) => {
        setPending((edits) => {
          const next = { ...edits };
          for (const key of Object.keys(input) as OfferRule[]) delete next[key];
          return next;
        });
        toastManager.add({ type: "error", title: m.auth_account_account_update_error() });
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries();
        setPending({});
      },
    }),
  );
  const editRule = (key: OfferRule) => (checked: boolean) => mutation.mutate({ [key]: checked });

  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-3 text-sm font-medium">{m.auth_account_offers_heading()}</legend>
      <SwitchRow
        id="account-only-wanted-offers"
        label={m.auth_account_only_wanted_label()}
        description={m.auth_account_only_wanted_desc()}
        checked={rule("onlyWantedOffers")}
        onCheckedChange={editRule("onlyWantedOffers")}
      />
      <SwitchRow
        id="account-allow-collection-asks"
        label={m.auth_account_collection_asks_label()}
        description={m.auth_account_collection_asks_desc()}
        checked={rule("allowCollectionAsks")}
        onCheckedChange={editRule("allowCollectionAsks")}
      />
    </fieldset>
  );
}
