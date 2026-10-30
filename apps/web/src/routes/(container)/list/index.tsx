import { CardsThreeIcon, DiscordLogoIcon, PlusIcon } from "@phosphor-icons/react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { TotalCount } from "@/components/shared/count-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DiscordFormatDialog } from "@/features/discord/discord-format-dialog";
import { CreateListDialog } from "@/features/list/create-list-dialog";
import { ListRows, ListRowsSkeleton } from "@/features/list/list-rows";
import { listPreviewsOptions } from "@/features/list/queries";
import { useListPreviews } from "@/features/list/use-list-previews";
import { useUserLists } from "@/features/user/hooks";
import { currentUserOptions, requireSignedIn } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/list/")({
  beforeLoad: requireSignedIn,
  loader: async ({ context: { queryClient } }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    // a failed preview read leaves the rows to fetch it again, not the page to fail
    await queryClient
      .query({
        ...listPreviewsOptions(user?.lists.map((list) => list.slug) ?? []),
        staleTime: "static",
      })
      .catch(() => undefined);
  },
  head: () => generateMetadata({ title: m.page_titles_my_list() }),
  component: ListsPage,
  pendingComponent: ListsPending,
});

function ListsPage() {
  const lists = useUserLists();
  const getPreview = useListPreviews(lists.map((list) => list.slug));
  const [createOpen, setCreateOpen] = useState(false);
  const [discordOpen, setDiscordOpen] = useState(false);

  return (
    <>
      <PageHeader
        title={m.list_title()}
        description={<TotalCount count={lists.length} />}
        aside={
          <div className="flex flex-wrap items-center gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setDiscordOpen(true)}>
              <DiscordLogoIcon weight="fill" />
              {m.nav_discord_format()}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              {m.list_create_button()}
            </Button>
          </div>
        }
      />

      {lists.length === 0 ? (
        <EmptyState
          icon={CardsThreeIcon}
          title={m.list_none_title()}
          hint={m.list_none_hint()}
          action={
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              {m.list_create_button()}
            </Button>
          }
        />
      ) : (
        <ListRows lists={lists} getPreview={getPreview} />
      )}

      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DiscordFormatDialog open={discordOpen} onOpenChange={setDiscordOpen} />
    </>
  );
}

function ListsPending() {
  return (
    <>
      <PageHeader title={m.list_title()} />
      <ListRowsSkeleton />
    </>
  );
}
