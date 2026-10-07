import type { ListTypeNew } from "@repo/api/schemas/list";

import { Badge } from "@/components/ui/badge";
import { LIST_TYPE_LABEL } from "@/features/list/list-type-badge";

/** Mono like the post tags: on Trade the objekt cards keep the colour. */
export function ListRoleBadge({ type }: { type: ListTypeNew }) {
  return (
    <Badge variant="outline" size="sm" className="font-mono">
      {LIST_TYPE_LABEL[type]()}
    </Badge>
  );
}
