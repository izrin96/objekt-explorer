import { EllipsisVerticalIcon } from "@heroicons/react/24/outline";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { useUserLists } from "@/hooks/use-user";
import type { PublicList } from "@/lib/universal/list";
import { getListLinkOption, parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Link } from "../intentui/link";
import { Loader } from "../intentui/loader";
import { Menu, MenuContent, MenuItem } from "../intentui/menu";
import ErrorFallbackRender from "../router/error-boundary";
import { ListTypeBadge } from "../shared/list-type-badge";
import { CreateListModal } from "./modal/create-list-modal";
import { DeleteListModal } from "./modal/delete-list-modal";
import { EditListModal } from "./modal/edit-list-modal";
import { GenerateDiscordFormatModal } from "./modal/generate-discord";

export default function MyListRender() {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
          <Suspense
            fallback={
              <div className="flex justify-center">
                <Loader variant="ring" />
              </div>
            }
          >
            <MyList />
          </Suspense>
        </ErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

function MyList() {
  const [addOpen, setAddOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const lists = useUserLists();
  return (
    <div className="flex flex-col gap-4">
      <div className="text-xl font-semibold">{m.list_title()}</div>

      <CreateListModal open={addOpen} setOpen={setAddOpen} />
      <GenerateDiscordFormatModal open={genOpen} setOpen={setGenOpen} />

      <div className="flex w-full gap-2">
        <Button onPress={() => setAddOpen(true)}>{m.list_create_button()}</Button>
        <Button intent="outline" onPress={() => setGenOpen(true)}>
          {m.list_generate_discord_button()}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <ListCard list={list} key={list.slug} />
        ))}
      </div>
    </div>
  );
}

type ListCardProps = {
  list: PublicList;
};

function ListCard({ list }: ListCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  return (
    <>
      <EditListModal slug={list.slug} open={editOpen} setOpen={setEditOpen} />
      <DeleteListModal slug={list.slug} open={deleteOpen} setOpen={setDeleteOpen} />
      <div className="hover:bg-muted flex flex-col gap-3 rounded-lg border p-4 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">
                <Link {...getListLinkOption(list)}>{list.name}</Link>
              </h3>
              <ListTypeBadge type={list.listTypeNew} />
              {list.currency && <span className="text-muted-fg text-xs">({list.currency})</span>}
            </div>
            {list.profile && (
              <span className="text-muted-fg text-sm">
                {parseNickname(list.profile.address, list.profile.nickname)}
              </span>
            )}
          </div>
          <Menu>
            <Button intent="outline" size="sq-xs">
              <EllipsisVerticalIcon />
            </Button>
            <MenuContent placement="bottom right" popover={{ offset: -2 }}>
              <MenuItem onAction={() => setEditOpen(true)}>{m.list_card_edit()}</MenuItem>
              <MenuItem intent="danger" onAction={() => setDeleteOpen(true)}>
                {m.list_card_delete()}
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
    </>
  );
}
