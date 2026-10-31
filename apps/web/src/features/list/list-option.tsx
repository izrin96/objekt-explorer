import type { ListType } from "@repo/api/schemas/list";

import { ListTypeBadge } from "./list-type-badge";

/** A list's type badge, then its name, as every list dropdown draws it. */
export function ListLabel({ name, type }: { name: string; type: ListType }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <ListTypeBadge type={type} className="shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  );
}

/** A list as a `SingleSelect` option. */
export const listOption = (list: { slug: string; name: string; type: ListType }) => ({
  value: list.slug,
  label: <ListLabel name={list.name} type={list.type} />,
  text: list.name,
});
