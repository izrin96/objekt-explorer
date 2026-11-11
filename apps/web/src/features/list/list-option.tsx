import type { ListType } from "@repo/api/schemas/list";

import { ListLabel } from "./list-label";

/** A list as a `SingleSelect` option. */
export const listOption = (list: { slug: string; name: string; type: ListType }) => ({
  value: list.slug,
  label: <ListLabel name={list.name} type={list.type} />,
  text: list.name,
});
