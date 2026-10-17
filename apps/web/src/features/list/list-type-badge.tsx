import { CheckIcon } from "@phosphor-icons/react";
import type { ListTypeNew } from "@repo/api/schemas/list";
import { type OpenTo, openToOf } from "@repo/api/schemas/open-to";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { type Tone, toneChip } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export const LIST_TYPE_LABEL: Record<ListTypeNew, () => string> = {
  general: m.list_type_general,
  sale: m.list_type_sale,
  have: m.list_type_have,
  want: m.list_type_want,
};

export const LIST_TYPE_TONE: Record<ListTypeNew, Tone> = {
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
  type: ListTypeNew;
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

export const OPEN_TO_LABEL: Record<OpenTo, () => string> = {
  swaps: m.list_create_match_swaps_label,
  both: m.list_create_match_both_label,
  buying: m.list_create_match_buying_label,
};

/** A want list's Open to setting; null for other lists, or a response without it. */
export function openToLabel(list: {
  listTypeNew: ListTypeNew;
  matchSale?: boolean | null;
  matchHave?: boolean | null;
}) {
  if (list.listTypeNew !== "want" || list.matchSale == null) return null;
  return OPEN_TO_LABEL[
    openToOf({ matchSale: list.matchSale, matchHave: list.matchHave ?? true })
  ]();
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
