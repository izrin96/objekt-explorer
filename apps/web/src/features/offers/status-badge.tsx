import { Badge, type BadgeProps } from "@/components/ui/badge";
import { type Tone, toneChip } from "@/lib/tone";
import { cn } from "@/lib/utils";

export function StatusBadge({
  tone,
  className,
  ...props
}: Omit<BadgeProps, "variant"> & { tone: Tone }) {
  return <Badge variant="outline" className={cn(toneChip(tone), className)} {...props} />;
}
