import type { ListType } from "@repo/api/schemas/list";

import { ListTypeBadge } from "./list-type-badge";

/** A list as a dropdown option: its type badge, then its name, as Compare with draws it. */
export const listOption = (list: { slug: string; name: string; type: ListType }) => ({
  value: list.slug,
  label: (
    <span className="flex items-center gap-1.5">
      <ListTypeBadge type={list.type} />
      {list.name}
    </span>
  ),
  text: list.name,
});
