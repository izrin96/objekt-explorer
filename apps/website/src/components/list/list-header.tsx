import { DiscordLogoIcon, XLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useIntlayer } from "react-intlayer";

import { useListTarget } from "@/hooks/use-list-target";
import { useProfileTarget } from "@/hooks/use-profile-target";
import { useListAuthed } from "@/hooks/use-user";
import { parseNickname } from "@/lib/utils";

import { Avatar } from "../intentui/avatar-custom";
import { Button } from "../intentui/button";
import { Link } from "../intentui/link";
import { EditListModal } from "./modal/manage-list";

export default function ListHeader() {
  const list = useListTarget()!;
  const profile = useProfileTarget();
  const isListAuthed = useListAuthed();

  const isProfileList = list.listType === "profile";
  const isProfileContext = isProfileList || (list.listType === "normal" && list.profileAddress);

  // Use profile info when in profile context
  const displayUser = isProfileContext && profile ? profile.user : list.user;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col flex-wrap items-start gap-4 sm:flex-row sm:items-center">
        {/* Profile context: show nickname/address without avatar */}
        {isProfileContext && profile ? (
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">{list.name}</h2>
              {list.currency && <span className="text-muted-fg text-xs">({list.currency})</span>}
            </div>
            <div className="text-muted-fg text-sm">
              <Link
                to={`/@$nickname`}
                params={{
                  nickname: profile.nickname || profile.address,
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
            {displayUser && (
              <Avatar
                size="xl"
                className="self-center"
                src={displayUser.image}
                alt={displayUser.name}
                initials={displayUser.name.charAt(0)}
              />
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{list.name}</span>
                {list.currency && <span className="text-muted-fg text-xs">({list.currency})</span>}
              </div>
              {displayUser && (
                <div className="flex items-center gap-2">
                  <span className="text-muted-fg text-sm">{displayUser.name}</span>
                  {displayUser.showSocial && (
                    <>
                      {displayUser.discord && (
                        <div className="flex gap-1">
                          <span className="text-muted-fg text-sm">{displayUser.discord}</span>
                          <DiscordLogoIcon className="self-center" size={16} weight="regular" />
                        </div>
                      )}
                      {displayUser.twitter && (
                        <div className="flex gap-1">
                          <span className="text-muted-fg text-sm">{displayUser.twitter}</span>
                          <XLogoIcon className="self-center" size={16} weight="regular" />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {isListAuthed && <EditList slug={list.slug} />}
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
  const content = useIntlayer("list");

  const onSave = () => {
    void router.navigate({
      to: `/list/${slug}`,
      replace: true,
    });
  };

  return (
    <>
      <EditListModal slug={slug} open={open} setOpen={setOpen} onSave={onSave} />
      <Button
        size="sm"
        intent="outline"
        onPress={() => setOpen(true)}
        className="w-full flex-none sm:w-auto"
      >
        {content.card.edit_list.value}
      </Button>
    </>
  );
}
