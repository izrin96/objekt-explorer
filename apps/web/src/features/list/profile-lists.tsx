import { RectangleDashedIcon } from "@phosphor-icons/react";
import type { ListType, PublicList } from "@repo/api/schemas/list";
import { useSuspenseQuery } from "@tanstack/react-query";

import { EmptyState } from "@/components/shared/empty-state";
import { m } from "@/paraglide/messages";

import { type GetPreview, ListRow, ListRowGroup, ListRowsSkeleton, ListSection } from "./list-rows";
import { profileListsOptions } from "./queries";
import { useListPreviews } from "./use-list-previews";

/**
 * Every list filed under that Cosmo, bound to it or only displayed on it: what it has (have and
 * sale lists) beside what it wants, and its general lists under both.
 */
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

  const has = lists.filter((list) => list.listType === "have" || list.listType === "sale");
  const wants = lists.filter((list) => list.listType === "want");
  const general = lists.filter((list) => list.listType === "general");

  return (
    <div className="flex flex-col gap-6">
      {has.length > 0 || wants.length > 0 ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <ProfileListColumn
            title={m.list_profile_has()}
            tone="have"
            lists={has}
            getPreview={getPreview}
            empty={m.list_profile_has_empty()}
          />
          <ProfileListColumn
            title={m.list_profile_wants()}
            tone="want"
            lists={wants}
            getPreview={getPreview}
            empty={m.list_profile_wants_empty()}
          />
        </div>
      ) : null}
      {general.length > 0 ? (
        <ProfileListColumn
          title={m.list_profile_other()}
          tone="general"
          lists={general}
          getPreview={getPreview}
        />
      ) : null}
    </div>
  );
}

function ProfileListColumn({
  title,
  tone,
  lists,
  getPreview,
  empty,
}: {
  title: string;
  tone: ListType;
  lists: PublicList[];
  getPreview: GetPreview;
  /** shown in place of rows, so a side with none still holds its place */
  empty?: string;
}) {
  return (
    <ListSection title={title} tone={tone} count={lists.length}>
      {lists.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-3 py-6 text-center text-sm">
          {empty}
        </p>
      ) : (
        <ListRowGroup>
          {lists.map((list) => (
            <ListRow
              key={list.slug}
              list={list}
              preview={getPreview(list.slug)}
              showProfile={false}
              // Has holds have and sale lists, so a sale list says which it is
              showType={list.listType === "sale"}
            />
          ))}
        </ListRowGroup>
      )}
    </ListSection>
  );
}

/** The two columns while the tab loads. */
export function ProfileListsSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ListRowsSkeleton />
      <div className="hidden xl:block">
        <ListRowsSkeleton status={false} />
      </div>
    </div>
  );
}
