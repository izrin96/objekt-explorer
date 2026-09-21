import type { ListTypeNew } from "@repo/api/schemas/list";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { m } from "@/paraglide/messages";

export const LIST_TYPE_LABEL: Record<ListTypeNew, () => string> = {
  general: m.list_type_general,
  sale: m.list_type_sale,
  have: m.list_type_have,
  want: m.list_type_want,
};

const LIST_TYPE_VARIANT: Record<ListTypeNew, BadgeProps["variant"]> = {
  general: "secondary",
  sale: "info",
  have: "success",
  want: "warning",
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
  return (
    <Badge variant={LIST_TYPE_VARIANT[type]} size={size} className={className}>
      {LIST_TYPE_LABEL[type]()}
    </Badge>
  );
}
