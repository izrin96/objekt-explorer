import { DiscordLogoIcon, XLogoIcon, CodeSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";

import { useListTarget } from "@/hooks/use-list-target";
import { useProfileTarget } from "@/hooks/use-profile-target";
import { useListAuthed } from "@/hooks/use-user";
import { getListLinkOption, parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Avatar } from "../intentui/avatar-custom";
import { Button, buttonStyles } from "../intentui/button";
import { Link } from "../intentui/link";
import { ListTypeBadge } from "../shared/list-type-badge";
import { EditListModal } from "./modal/edit-list-modal";

export default function ListHeader() {
  const list = useListTarget()!;
  const profile = useProfileTarget();
  const isListAuthed = useListAuthed();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col flex-wrap items-start gap-4 sm:flex-row sm:items-center">
        {/* Profile context: show nickname/address without avatar */}
        {list.profileAddress && profile ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{list.name}</h2>
              {list.listTypeNew !== "general" && <ListTypeBadge type={list.listTypeNew} />}
              {list.listTypeNew === "sale" && list.currency && (
                <span className="text-muted-fg text-xs">({list.currency})</span>
              )}
            </div>
            <div className="text-muted-fg text-sm">
              <Link
                to={`/@{$nickname}`}
                params={{
                  nickname: profile.nickname || profile.address.toLowerCase(),
                }}
                className="text-muted-fg hover:underline"
              >
                {parseNickname(profile.address, profile.nickname)}
              </Link>
            </div>
          </div>
        ) : (
          /* Account context: show avatar + user info (existing) */
          <div className="flex items-center gap-3">
            {list.user && (
              <Avatar
                size="xl"
                className="self-center"
                src={list.user.image}
                alt={list.user.name ?? undefined}
                initials={(list.user.name ?? "").charAt(0)}
              />
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{list.name}</span>
                {list.listTypeNew !== "general" && <ListTypeBadge type={list.listTypeNew} />}
                {list.listTypeNew === "sale" && list.currency && (
                  <span className="text-muted-fg text-xs">({list.currency})</span>
                )}
              </div>
              {list.user && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-fg text-sm">{list.user.name}</span>
                  {list.user.discord && (
                    <div className="flex gap-1">
                      <span className="text-muted-fg text-sm">{list.user.discord}</span>
                      <DiscordLogoIcon className="self-center" size={16} weight="regular" />
                    </div>
                  )}
                  {list.user.twitter && (
                    <div className="flex gap-1">
                      <span className="text-muted-fg text-sm">{list.user.twitter}</span>
                      <XLogoIcon className="self-center" size={16} weight="regular" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {["have", "want"].includes(list.listTypeNew) && list.linkedList && (
            <Link
              className={buttonStyles({
                intent: "outline",
                size: "sm",
                className: "w-full sm:w-auto",
              })}
              {...getListLinkOption(list.linkedList)}
            >
              <CodeSimpleIcon />
              {list.listTypeNew === "have" ? m.list_swap_to_want() : m.list_swap_to_have()}
            </Link>
          )}
          {isListAuthed && <EditList slug={list.slug} />}
        </div>
      </div>
      {list.description && (
        <span className="text-fg text-sm whitespace-pre-wrap">{list.description}</span>
      )}
    </div>
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
      <Button size="sm" intent="outline" onPress={() => setOpen(true)} className="w-full sm:w-auto">
        {m.list_card_edit_list()}
      </Button>
    </>
  );
}
