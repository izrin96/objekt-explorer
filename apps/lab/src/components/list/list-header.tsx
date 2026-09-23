import {
  ArrowsLeftRightIcon,
  DiscordLogoIcon,
  DownloadSimpleIcon,
  PencilSimpleIcon,
  ShareNetworkIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Link, useNavigate } from "@tanstack/react-router";

import { CompareButton } from "@/components/compare/compare-dialog";
import { DeleteListDialog } from "@/components/list/delete-list-dialog";
import { EditListDialog } from "@/components/list/edit-list-dialog";
import { notImplemented } from "@/components/shared/not-implemented";
import { SocialBadge } from "@/components/shared/social-badge";
import { TimeAgo } from "@/components/shared/time-ago";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/store/account";
import { useCosmoLinks } from "@/store/link";
import { type LabList, LIST_TYPE_LABEL, LIST_TYPE_VARIANT, useLists } from "@/store/lists";

/**
 * Port of `list/list-header.tsx`: identity on the left, owner + actions on the
 * right, description underneath. The app's owner-scoped URL
 * (`/@nickname/list/<slug>`) is one route here, so a list filed under a profile
 * names that profile rather than living at a second address.
 */
export function ListHeader({ list }: { list: LabList }) {
  const navigate = useNavigate();
  const linked = useLists((s) => s.lists.find((l) => l.id === list.linkedListId));
  // the handles belong to the account that owns the list, not to the Cosmo
  const account = useAccount((s) => s.account);
  const links = useCosmoLinks((s) => s.links);
  // a list filed under a Cosmo names it; one with no profile names the
  // signed-in user's own Cosmo, so the row says "izrin96" either way instead of
  // switching to the site account's display name. `isProfileBind` only decides
  // whether that profile's Lists tab shows the list, never who owns it.
  const owner = list.profileNickname ?? links[0]?.nickname ?? null;
  const swappable = (list.type === "have" || list.type === "want") && linked !== undefined;

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 flex-col justify-center gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[22px] font-semibold tracking-tight text-balance">
              {list.name}
            </h1>
            <Badge variant={LIST_TYPE_VARIANT[list.type]} size="sm">
              {LIST_TYPE_LABEL[list.type]}
            </Badge>
            {list.type === "sale" && list.currency !== "" && (
              <span className="text-muted-foreground font-mono text-xs">({list.currency})</span>
            )}
          </div>

          {/* Owner block, ported from the website minus the avatar, then the
              owning account's handles. It is its own row rather than the first
              token of the meta line below — folded in there it read as one more
              `·`-separated count.

              Same shape as the profile header's identity block, in the same
              order: the Cosmo nickname as the heading — bound to a profile or
              not, so the two cases do not read as two kinds of owner — then the
              site account as the `cosmo` pill, then that account's handles. The
              account name is a chip and not the heading because it is the
              account behind the handles, not the owner of the list. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {owner !== null && (
              <Link
                to="/profile/$nickname"
                params={{ nickname: owner }}
                className="font-display text-foreground max-w-full truncate text-[15px] font-semibold underline-offset-2 hover:underline"
              >
                {owner}
              </Link>
            )}
            <SocialBadge platform="cosmo" username={account.name} />
            {account.showSocial && account.discord !== null && (
              <SocialBadge platform="discord" username={account.discord} />
            )}
            {account.showSocial && account.twitter !== null && (
              <SocialBadge platform="twitter" username={account.twitter} />
            )}
          </div>

          <div className="text-muted-foreground text-[13px]">
            <span className="font-mono">{list.entries.length}</span> objekts · updated{" "}
            <TimeAgo date={list.updatedAt} /> · {list.isPublic ? "public" : "private"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 md:items-end">
          {swappable && (
            <Button
              variant="outline"
              size="sm"
              render={<Link to="/list/$slug" params={{ slug: linked.id }} replace />}
            >
              <ArrowsLeftRightIcon />
              Swap to {list.type === "have" ? "want" : "have"}
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              notImplemented({ title: "Link copied", description: `/list/${list.id}` })
            }
          >
            <ShareNetworkIcon />
            Share
          </Button>
          <CompareButton list={list} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => notImplemented({ title: "Copied Discord format" })}
          >
            <DiscordLogoIcon weight="fill" className="text-discord" />
            Discord format
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              notImplemented({
                title: "Export started",
                description: `${list.entries.length} rows · ${list.id}.csv`,
              })
            }
          >
            <DownloadSimpleIcon />
            Export
          </Button>
          <EditListDialog list={list}>
            <Button variant="outline" size="sm">
              <PencilSimpleIcon />
              Edit
            </Button>
          </EditListDialog>
          <DeleteListDialog list={list} onDeleted={() => void navigate({ to: "/list" })}>
            <Button variant="destructive-outline" size="sm">
              <TrashIcon />
              Delete
            </Button>
          </DeleteListDialog>
        </div>
      </div>

      {list.description !== "" && (
        <p className="text-foreground text-sm whitespace-pre-wrap">{list.description}</p>
      )}
    </div>
  );
}
