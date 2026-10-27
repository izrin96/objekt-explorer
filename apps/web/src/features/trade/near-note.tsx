import { type ComposerStart, startForList } from "@repo/api/schemas/trade-post";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { Note } from "@/components/shared/note";
import { Button } from "@/components/ui/button";
import { useOpenAddToList } from "@/features/list/add-to-list-dialog";
import { useUserLists } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

import type { NearOpen } from "./near";
import { type NearFix, nearFixOf, nearFixStart } from "./near-fix";
import { usePlanLists } from "./post-plan";

type Why = (input: { person: string; theirs: string; mine: string }) => string;

const WHY: Record<NearFix, Why> = {
  "sale-list": m.trade_near_why_sell,
  "open-sale": m.trade_near_why_swap_sale,
  "open-want-swaps": m.trade_near_why_swap_want,
  "open-want-buying": m.trade_near_why_buy,
};

/**
 * The objekt drawer's line for a near match: why it isn't counted, and the one fix on the viewer's
 * side. A fix closes the drawer first, so its dialog isn't stacked on it.
 */
export function NearNote({
  objekt,
  near,
  onClose,
  onCompose,
}: {
  objekt: ValidObjekt;
  near: NearOpen;
  onClose: () => void;
  onCompose: (start: ComposerStart) => void;
}) {
  const lists = useUserLists();
  const planLists = usePlanLists();
  const openAddToList = useOpenAddToList();
  const mine = lists.find((list) => near.myListIds.includes(list.id));
  // the viewer's lists are still loading; the line can't name theirs yet
  if (!mine) return null;
  const fix = nearFixOf(near.verb, near.role);
  const why = WHY[fix]({ person: near.person ?? "", theirs: near.theirList, mine: mine.name });
  const fixLabel =
    fix === "sale-list"
      ? m.trade_near_fix_sale_list()
      : fix === "open-want-buying"
        ? m.trade_near_fix_open_buying({ list: mine.name })
        : m.trade_near_fix_open_swaps({ list: mine.name });
  const runFix = () => {
    onClose();
    if (fix === "sale-list") openAddToList([objekt], { saleOnly: { profiles: holders() } });
    else onCompose(nearFixStart(startForList(planLists, mine.slug), fix));
  };
  const { makeOffer } = near;
  // the profiles the viewer's copy is bound to, unknown once one of its lists is unbound
  const holders = () => {
    const holding = lists.filter((list) => near.myListIds.includes(list.id));
    const bound = holding.flatMap((list) =>
      list.isProfileBind && list.profileAddress !== null ? [list.profileAddress] : [],
    );
    return bound.length === holding.length ? bound : null;
  };

  return (
    <Note className="flex flex-col items-start gap-2 p-3">
      <p>{why}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button variant="link" className="h-auto p-0" onClick={runFix}>
          {fixLabel}
        </Button>
        {makeOffer ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onClose();
              makeOffer();
            }}
          >
            {m.trade_near_make_offer()}
          </Button>
        ) : null}
      </div>
    </Note>
  );
}
