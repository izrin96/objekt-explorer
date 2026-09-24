import { CardsThreeIcon, DiscordLogoIcon, PlusIcon } from "@phosphor-icons/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { DiscordFormatDialog } from "@/features/discord/discord-format-dialog";
import { CreateListDialog } from "@/features/list/create-list-dialog";
import { ListCard } from "@/features/list/list-card";
import { useUserLists } from "@/features/user/hooks";
import { currentUserOptions } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/list/")({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    if (!user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  head: () => generateMetadata({ title: m.page_titles_my_list() }),
  component: ListsPage,
});

function ListsPage() {
  const lists = useUserLists();
  const [createOpen, setCreateOpen] = useState(false);
  const [discordOpen, setDiscordOpen] = useState(false);

  return (
    <>
      <PageHeader
        title={m.list_title()}
        description={
          <>
            <b className="text-foreground font-mono font-semibold tabular-nums">{lists.length}</b>
            {m.common_count_total_suffix()}
          </>
        }
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((list) => (
            <ListCard key={list.slug} list={list} />
          ))}
        </div>
      )}

      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} />
      <DiscordFormatDialog open={discordOpen} onOpenChange={setDiscordOpen} />
    </>
  );
}
