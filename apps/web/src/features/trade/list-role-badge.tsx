import type { ListTypeNew } from "@repo/api/schemas/list";

import { ListTypeBadge } from "@/features/list/list-type-badge";

export function ListRoleBadge({ type }: { type: ListTypeNew }) {
  return <ListTypeBadge type={type} className="font-mono" />;
}
