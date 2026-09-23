import {
  CardsThreeIcon,
  DeviceMobileIcon,
  LinkSimpleIcon,
  PencilSimpleIcon,
  PlusIcon,
  ShareNetworkIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { createRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { CreateListDialog } from "@/components/list/create-list-dialog";
import { DeleteListDialog } from "@/components/list/delete-list-dialog";
import { EditListDialog } from "@/components/list/edit-list-dialog";
import { ObjektCard } from "@/components/objekt-card";
import { EmptyState } from "@/components/shared/empty-state";
import { notImplemented } from "@/components/shared/not-implemented";
import { PageHeader } from "@/components/shared/page-header";
import { TimeAgo } from "@/components/shared/time-ago";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { type LabObjekt, objekts } from "@/fixtures/objekts";
import { rootRoute } from "@/routes/root";
import { scopeArtists, useArtists } from "@/store/artists";
import { type LabList, LIST_TYPE_LABEL, LIST_TYPE_VARIANT, useLists } from "@/store/lists";

function typeLabel(list: LabList): string {
  const label = LIST_TYPE_LABEL[list.type];
  return list.type === "sale" && list.currency !== "" ? `${label} · ${list.currency}` : label;
}

function ListCard({ list, pool, lists }: { list: LabList; pool: LabObjekt[]; lists: LabList[] }) {
  // the pool shrinks with the artist scope, so wrap rather than run off the end
  const start = pool.length > 0 ? list.start % pool.length : 0;
  const linked = lists.find((l) => l.id === list.linkedListId);

  return (
    <div className="bg-card grid grid-cols-[1fr_6rem] gap-2.5 rounded-lg border px-3.5 pt-3.5 pb-3">
      <div className="min-w-0">
        <div className="font-display flex flex-wrap items-center gap-2 text-[15px] font-semibold">
          <Link
            to="/list/$slug"
            params={{ slug: list.id }}
            className="underline-offset-2 hover:underline"
          >
            {list.name}
          </Link>
          <Badge variant={LIST_TYPE_VARIANT[list.type]} size="sm">
            {typeLabel(list)}
          </Badge>
        </div>
        <div className="text-muted-foreground mt-1 text-[12.5px]">
          <span className="font-mono">{list.entries.length}</span> objekts · updated{" "}
          <TimeAgo date={list.updatedAt} />
          {list.description && ` · ${list.description}`}
        </div>
        {(linked !== undefined || list.profileNickname !== null) && (
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5 text-[12px]">
            {linked !== undefined && (
              <Link
                to="/list/$slug"
                params={{ slug: linked.id }}
                className="bg-secondary hover:bg-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5"
              >
                <LinkSimpleIcon className="size-3 opacity-60" />
                {linked.name}
              </Link>
            )}
            {/* the same phone glyph the avatar menu's "My Cosmo" item uses, so
                this reads as the Cosmo the list hangs off rather than as the
                site account, which is the card's only owner line. The glyph
                already says "on a Cosmo", so the chip is the nickname and
                nothing else. The test is `profileNickname !== null` — which
                Cosmo the list belongs to — never `isProfileBind`: a list filed
                under a Cosmo but kept off its Lists tab still names it here. */}
            {list.profileNickname !== null && (
              <Link
                to="/profile/$nickname"
                params={{ nickname: list.profileNickname }}
                className="bg-secondary hover:bg-muted inline-flex items-center gap-1 rounded-full px-2 py-0.5"
              >
                <DeviceMobileIcon className="size-3 opacity-60" />
                <span className="sr-only">Cosmo profile</span>
                {list.profileNickname}
              </Link>
            )}
          </div>
        )}
      </div>
      {/* `items-start`: the row is a stretch container, so without it each
          thumbnail is pulled to the card's full height and the space under the
          photocard paints `bg-card` — invisible on the dark theme, a white
          block with a drop shadow on the light one */}
      <div className="flex items-start justify-end">
        {pool.slice(start, start + 3).map((o, i) => (
          <ObjektCard
            key={o.id}
            objekt={o}
            hideLabel
            className={
              "w-11 flex-none rounded-[4px] shadow-[-2px_0_6px_rgba(0,0,0,.25)] " +
              (i > 0 ? "-ml-5.5" : "")
            }
          />
        ))}
      </div>
      <div className="col-span-full mt-1 flex items-center gap-1.5">
        <Button
          variant="outline"
          size="xs"
          onClick={() => notImplemented({ title: "Link copied", description: `/list/${list.id}` })}
        >
          <ShareNetworkIcon />
          Share
        </Button>

        <Tooltip>
          <EditListDialog list={list}>
            <TooltipTrigger
              render={<Button variant="outline" size="icon-xs" aria-label="Edit list" />}
            >
              <PencilSimpleIcon />
            </TooltipTrigger>
          </EditListDialog>
          <TooltipPopup>Edit</TooltipPopup>
        </Tooltip>

        <Tooltip>
          <DeleteListDialog list={list}>
            <TooltipTrigger
              render={
                <Button variant="destructive-outline" size="icon-xs" aria-label="Delete list" />
              }
            >
              <TrashIcon />
            </TooltipTrigger>
          </DeleteListDialog>
          <TooltipPopup>Delete</TooltipPopup>
        </Tooltip>

        <span className="text-muted-foreground ml-auto text-xs">
          {list.isPublic ? "public" : "private"}
        </span>
      </div>
    </div>
  );
}

function Lists() {
  const [createOpen, setCreateOpen] = useState(false);
  const lists = useLists((s) => s.lists);
  const scope = useArtists((s) => s.selected);
  // the stacked thumbnails only draw objekts the globally selected artists cover
  const pool = useMemo(() => scopeArtists(objekts, scope), [scope]);
  const total = lists.reduce((sum, l) => sum + l.entries.length, 0);

  return (
    <>
      <PageHeader
        title="My lists"
        description={
          <>
            <span className="font-mono">{lists.length}</span> lists ·{" "}
            <span className="font-mono">{total}</span> objekts across them
          </>
        }
        aside={
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon />
            Create list
          </Button>
        }
      />

      {lists.length === 0 ? (
        <EmptyState
          icon={CardsThreeIcon}
          title="No lists yet"
          hint="A list groups objekts you own, want, or are selling. Create one, then add to it from any grid."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <PlusIcon />
              Create list
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lists.map((l) => (
            <ListCard key={l.id} list={l} pool={pool} lists={lists} />
          ))}
        </div>
      )}

      <CreateListDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}

export const listsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/list",
  component: Lists,
});
