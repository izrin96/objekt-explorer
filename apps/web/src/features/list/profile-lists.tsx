import { RectangleDashedIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import { m } from "@/paraglide/messages";

import { ListCard } from "./list-card";
import { profileListsOptions } from "./queries";
import { useListPreviews } from "./use-list-previews";

/** Every list filed under that Cosmo, bound to it or only displayed on it. */
export function ProfileLists({ address }: { address: string }) {
  const { data: lists } = useSuspenseQuery(profileListsOptions(address));
  const getPreview = useListPreviews(lists.map((list) => list.slug));

  if (lists.length === 0) {
    return (
      <EmptyState
        icon={RectangleDashedIcon}
        title={m.list_no_lists_found()}
        hint={m.list_no_lists_found_hint()}
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {lists.map((list) => (
        <ListCard key={list.slug} list={list} preview={getPreview(list.slug)} showProfile={false} />
      ))}
    </div>
  );
}
