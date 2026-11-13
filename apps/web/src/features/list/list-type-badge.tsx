import { CheckIcon, CoinsIcon } from "@phosphor-icons/react";
import type { ListType, PublicList } from "@repo/api/schemas/list";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { toneChip } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { offTradeOpenTo } from "./list-open-to";
import { LIST_TYPE_LABEL, LIST_TYPE_TONE, OPEN_TO_LABEL } from "./list-type-labels";
import { useIsListOwner } from "./use-list-owned";

export function ListTypeBadge({
  type,
  size = "sm",
  className,
}: {
  type: ListType;
  size?: BadgeProps["size"];
  className?: string;
}) {
  const tone = LIST_TYPE_TONE[type];
  return (
    <Badge
      variant={tone === "neutral" ? "secondary" : "outline"}
      size={size}
      className={cn(toneChip(tone), className)}
    >
      {LIST_TYPE_LABEL[type]()}
    </Badge>
  );
}

export function ListBoundBadge() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Badge variant="outline" size="sm" render={<button type="button" />}>
            <CheckIcon weight="bold" aria-hidden />
            {m.list_bound_badge()}
          </Badge>
        }
      />
      <TooltipPopup>{m.list_bound_hint()}</TooltipPopup>
    </Tooltip>
  );
}

/** A sale list's currency, the one its prices are in. */
export function ListCurrencyBadge({ currency }: { currency: string }) {
  const label = m.list_currency_badge_label({ currency });
  return (
    <Badge variant="outline" size="sm" title={label}>
      <CoinsIcon aria-hidden />
      <span aria-hidden>{currency}</span>
      <span className="sr-only">{label}</span>
    </Badge>
  );
}

/** A want list's Open to, shown to its owner only while the list is off Trade; on Trade its post's tags say it. */
export function ListOpenToBadge({
  list,
  className,
}: {
  list: Pick<PublicList, "slug" | "listType" | "discoverable" | "matchSale" | "matchHave">;
  className?: string;
}) {
  const owned = useIsListOwner(list.slug);
  const openTo = owned ? offTradeOpenTo(list) : null;
  if (!openTo) return null;
  const choice = OPEN_TO_LABEL[openTo]();
  const label = m.list_open_to_badge_label({ choice });
  return (
    <Badge variant="outline" size="sm" title={label} className={className}>
      <span aria-hidden>{choice}</span>
      <span className="sr-only">{label}</span>
    </Badge>
  );
}
