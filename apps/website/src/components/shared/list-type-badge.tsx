import type { ListTypeNew } from "@/lib/universal/list";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Badge } from "./badge";

const listTypeBadgeConfig: Record<ListTypeNew, { label: string; subtle: string; solid: string }> = {
  general: {
    label: m.list_type_general(),
    subtle: "border-border/50 bg-muted/50 !text-muted-fg",
    solid: "bg-muted !text-fg",
  },
  sale: {
    label: m.list_type_sale(),
    subtle: "border-blue-500/30 bg-blue-500/10 !text-blue-500",
    solid: "bg-blue-200 !text-blue-800 dark:bg-blue-200 dark:!text-blue-800",
  },
  have: {
    label: m.list_type_have(),
    subtle: "border-emerald-500/30 bg-emerald-500/10 !text-emerald-500",
    solid: "bg-emerald-200 !text-emerald-800 dark:bg-emerald-200 dark:!text-emerald-800",
  },
  want: {
    label: m.list_type_want(),
    subtle: "border-yellow-500/30 bg-yellow-500/10 !text-yellow-500",
    solid: "bg-yellow-200 !text-yellow-800 dark:bg-yellow-200 dark:!text-yellow-800",
  },
};

export function ListTypeBadge({
  className,
  type,
  variant = "subtle",
}: {
  className?: string;
  type: ListTypeNew;
  variant?: "subtle" | "solid";
}) {
  const config = listTypeBadgeConfig[type];
  return <Badge className={cn(config[variant], className)}>{config.label}</Badge>;
}
