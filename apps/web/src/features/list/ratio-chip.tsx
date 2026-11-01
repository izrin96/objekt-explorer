import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import { type RatioSide, ratioLabel, ratioName, ratioText } from "./ratio-text";

/**
 * A trade ratio, worded for the reader. A native `title` is its tooltip, since the chip sits inside
 * cards that are links or buttons and can't hold a focusable trigger of its own; where a caller lays
 * it inert over a card, the caller carries that title instead.
 */
export function RatioChip({
  ratio,
  side,
  owner,
  inherited = false,
  className,
}: {
  ratio: number;
  side: RatioSide;
  owner: boolean;
  /** followed from the list's Ratio for all; drawn apart for the owner only */
  inherited?: boolean;
  className?: string;
}) {
  const name = ratioName(ratio, side, { owner, inherited });
  return (
    <Badge
      variant="outline"
      size="sm"
      title={name}
      className={cn(
        "tabular-nums",
        owner && inherited && "text-muted-foreground border-muted-foreground border-dashed",
        className,
      )}
    >
      <span aria-hidden>{ratioText(ratio, side)}</span>
      <span className="sr-only">{ratioLabel(ratio, side, { owner, inherited })}</span>
    </Badge>
  );
}
