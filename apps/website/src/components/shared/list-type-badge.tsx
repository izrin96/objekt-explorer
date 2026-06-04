import type { ListTypeNew } from "@/lib/universal/list";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Badge } from "./badge";

const listTypeBadgeStyles: Record<ListTypeNew, { subtle: string; solid: string }> = {
  general: {
    subtle: "border-border/50 bg-muted/50 text-muted-fg",
    solid: "bg-secondary text-fg",
  },
  sale: {
    subtle: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
    solid: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  have: {
    subtle: "border-lime-500/30 bg-lime-500/10 text-lime-600 dark:text-lime-400",
    solid: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
  },
  want: {
    subtle: "border-yellow-500/30 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    solid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
};

function getListTypeLabel(type: ListTypeNew) {
  switch (type) {
    case "sale":
      return m.list_type_sale();
    case "have":
      return m.list_type_have();
    case "want":
      return m.list_type_want();
    case "general":
      return m.list_type_general();
  }
}

export function ListTypeBadge({
  className,
  type,
  variant = "subtle",
}: {
  className?: string;
  type: ListTypeNew;
  variant?: "subtle" | "solid";
}) {
  const styles = listTypeBadgeStyles[type];
  return <Badge className={cn(styles[variant], className)}>{getListTypeLabel(type)}</Badge>;
}
