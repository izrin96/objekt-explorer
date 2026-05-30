import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { CodeSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { useListTarget } from "@/hooks/use-list-target";
import { useProfileTarget } from "@/hooks/use-profile-target";
import { useListAuthed } from "@/hooks/use-user";
import type { PublicList } from "@/lib/universal/list";
import { getListLinkOption, parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Avatar } from "../intentui/avatar-custom";
import { Button, buttonStyles } from "../intentui/button";
import { Link } from "../intentui/link";
import { ListTypeBadge } from "../shared/list-type-badge";
import { SocialBadge } from "../shared/social-badge";
import { EditListModal } from "./modal/edit-list-modal";
import TradeMatches from "./trade/trade-matches";

export default function ListHeader() {
  const list = useListTarget()!;
  const profile = useProfileTarget();
  const isListAuthed = useListAuthed();

  return (
    <div className="flex flex-col gap-3.5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
        {/* Left: list identity */}
        <div className="flex min-w-0 flex-col justify-center gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-xl font-semibold">{list.name}</h2>
            {list.listTypeNew !== "general" && <ListTypeBadge type={list.listTypeNew} />}
            {list.listTypeNew === "sale" && list.currency && (
              <span className="text-muted-fg text-xs">({list.currency})</span>
            )}
          </div>
          {list.profileAddress && profile && (
            <div className="text-muted-fg text-sm">
              <Link
                to={`/@{$nickname}`}
                params={{
                  nickname: profile.nickname || profile.address.toLowerCase(),
                }}
                className="text-muted-fg truncate hover:underline"
              >
                {parseNickname(profile.address, profile.nickname)}
              </Link>
            </div>
          )}
        </div>

        {/* Right: user info + actions */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {list.user && (
            <div className="flex min-w-0 items-center gap-2.5 text-sm">
              <Avatar
                size="xl"
                className="shrink-0"
                src={list.user.image}
                alt={list.user.name ?? undefined}
                initials={(list.user.name ?? "").charAt(0)}
              />
              <div className="flex min-w-0 flex-col">
                <span className="font-display inline-flex truncate text-base font-semibold">
                  {list.user.name}
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {list.user.discord && (
                    <SocialBadge platform="discord" username={list.user.discord} />
                  )}
                  {list.user.twitter && (
                    <SocialBadge platform="twitter" username={list.user.twitter} />
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <SwapHaveWantList list={list} />
            <TradeMatches />
            {isListAuthed && <EditList slug={list.slug} />}
          </div>
        </div>
      </div>

      {list.description && (
        <span className="text-fg text-sm whitespace-pre-wrap">{list.description}</span>
      )}
    </div>
  );
}

function SwapHaveWantList({ list }: { list: PublicList }) {
  if (!["have", "want"].includes(list.listTypeNew) || !list.linkedList) return null;

  return (
    <Link
      className={buttonStyles({
        intent: "outline",
        size: "sm",
        className: "w-auto",
      })}
      {...getListLinkOption(list.linkedList)}
      replace
    >
      <CodeSimpleIcon />
      <span className="hidden lg:inline">
        {list.listTypeNew === "have" ? m.list_swap_to_want() : m.list_swap_to_have()}
      </span>
    </Link>
  );
}

function EditList({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const onSave = () => {
    void router.navigate({
      to: `/list/${slug}`,
      replace: true,
      reloadDocument: true,
    });
  };

  return (
    <>
      <EditListModal slug={slug} open={open} setOpen={setOpen} onSave={onSave} />
      <Button size="sm" intent="outline" onPress={() => setOpen(true)} className="w-auto">
        <PencilSquareIcon />
        <span className="hidden lg:inline">{m.list_card_edit_list()}</span>
      </Button>
    </>
  );
}
