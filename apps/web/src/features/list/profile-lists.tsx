import { RectangleDashedIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { m } from "@/paraglide/messages";

import { getListLinkOption } from "./list-link";
import { ListTypeBadge } from "./list-type-badge";
import { profileListsOptions } from "./queries";

/** Every list filed under that Cosmo, bound to it or only displayed on it. */
export function ProfileLists({ address }: { address: string }) {
  const { data: lists } = useSuspenseQuery(profileListsOptions(address));

  if (lists.length === 0) {
    return <EmptyState icon={RectangleDashedIcon} title={m.list_no_lists_found()} />;
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,380px),1fr))] gap-2">
      {lists.map((list) => (
        <Link
          key={list.slug}
          {...getListLinkOption(list)}
          className="bg-popover hover:bg-secondary/60 flex flex-col gap-1.5 rounded-lg border p-4 transition-colors"
        >
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold">{list.name}</h3>
            {list.listTypeNew !== "general" ? <ListTypeBadge type={list.listTypeNew} /> : null}
            {list.listTypeNew === "sale" && list.currency ? (
              <span className="text-muted-foreground font-mono text-xs">({list.currency})</span>
            ) : null}
          </div>
        </Link>
      ))}
    </div>
  );
}
