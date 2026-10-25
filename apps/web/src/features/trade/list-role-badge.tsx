import type { ListType } from "@repo/api/schemas/list";

import { ListTypeBadge } from "@/features/list/list-type-badge";

export function ListRoleBadge({ type }: { type: ListType }) {
  return <ListTypeBadge type={type} className="font-mono" />;
}
