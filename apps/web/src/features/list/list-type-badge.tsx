import type { ListTypeNew } from "@repo/api/schemas/list";

import { Badge, type BadgeProps } from "@/components/ui/badge";
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

/** A want list's Open to setting; null for other lists, or a response without it. */
export function openToLabel(list: { listTypeNew: ListTypeNew; matchSale?: boolean | null }) {
  if (list.listTypeNew !== "want" || list.matchSale == null) return null;
  return list.matchSale ? m.list_create_match_sales_label() : m.list_create_match_trades_label();
}
