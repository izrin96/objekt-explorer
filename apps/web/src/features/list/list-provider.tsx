import { type ReactNode } from "react";

import { type ListTarget, ListContext } from "./use-list-target";

export function ListProvider({ list, children }: { list: ListTarget; children: ReactNode }) {
  return <ListContext value={list}>{children}</ListContext>;
}
