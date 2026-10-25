import { CheckIcon, CoinsIcon } from "@phosphor-icons/react";
import type { ListType } from "@repo/api/schemas/list";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { type Tone, toneChip } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export const LIST_TYPE_LABEL: Record<ListType, () => string> = {
  general: m.list_type_general,
  sale: m.list_type_sale,
  have: m.list_type_have,
  want: m.list_type_want,
};

export const LIST_TYPE_TONE: Record<ListType, Tone> = {
  general: "neutral",
  have: "have",
  want: "want",
  sale: "sale",
};

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
    <Badge variant="outline" size="sm" className="font-mono" title={label}>
      <CoinsIcon aria-hidden />
      <span aria-hidden>{currency}</span>
      <span className="sr-only">{label}</span>
    </Badge>
  );
}
