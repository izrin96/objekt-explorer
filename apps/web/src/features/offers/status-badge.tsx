import type { MineRow } from "@repo/api/schemas/offer";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { type Tone, toneChip } from "@/lib/tone";
import { cn } from "@/lib/utils";

/** Trades by outcome; an offer is neutral unless it ended badly. */
const STATUS_TONE: Record<MineRow["status"], Tone> = {
  open: "neutral",
  accepted: "neutral",
  declined: "neutral",
  withdrawn: "neutral",
  countered: "neutral",
  cancelled: "destructive",
  expired: "destructive",
  in_progress: "progress",
  completed: "success",
  failed: "destructive",
};

export const statusTone = (status: MineRow["status"]) => STATUS_TONE[status];

export function StatusBadge({
  tone,
  className,
  ...props
}: Omit<BadgeProps, "variant"> & { tone: Tone }) {
  return <Badge variant="outline" className={cn(toneChip(tone), className)} {...props} />;
}
