import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { CopyIcon, DiscordLogoIcon, XLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import { useProfileAuthed } from "@/hooks/use-user";
import type { PublicProfile } from "@/lib/universal/user";
import { parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Avatar } from "../intentui/avatar-custom";
import { Button, buttonStyles } from "../intentui/button";
import { ExternalLink } from "../intentui/link";
import { EditProfileModal } from "../link/modal/manage-link";
import { ApolloIcon } from "../shared/apollo-icon";

export default function ProfileHeader({ user }: { user: PublicProfile }) {
  const ref = useRef<HTMLDivElement>(null);
  const [, copy] = useCopyToClipboard();
  const queryClient = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const isProfileAuthed = useProfileAuthed();
  const nickname = parseNickname(user.address, user.nickname);
  const params = useParams({ from: "/@{$nickname}" });

  const onSave = () => {
    void queryClient.invalidateQueries({
      queryKey: ["profile", params.nickname],
    });
  };

  useEffect(() => {
    if (user.bannerImgType && user.bannerImgUrl && ref.current) {
      // instant scroll to profile header if banner exists
      const offset = ref.current.offsetTop - 90;
      if (offset > 0) {
        window.scrollTo({
          top: offset,
          behavior: "instant",
        });
      }
    }
  }, [user.bannerImgType, user.bannerImgUrl]);

  return (
    <div
      className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-[1fr_auto] md:items-start md:pb-0"
      ref={ref}
    >
      {/* Identity: nickname + address */}
      <div className="order-1 flex min-w-0 flex-col">
        <h2 className="truncate text-xl font-semibold">{nickname}</h2>
        <div className="text-muted-fg inline-flex min-w-0 items-center gap-1 font-mono text-xs">
          <span className="truncate">{user.address}</span>
          <Button
            size="sq-xs"
            intent="plain"
            onPress={async () => {
              await copy(user.address);
              toast.success(m.profile_header_address_copied());
            }}
            aria-label={m.profile_header_address_copied()}
          >
            <CopyIcon size={14} />
          </Button>
        </div>
      </div>

      {/* Right column: buttons + user info */}
      <div className="order-2 flex flex-col gap-4 md:flex-row md:items-center">
        {/* User info - top on mobile, left on desktop */}
        {user.user && (
          <div className="order-1 flex min-w-0 items-center gap-2 text-sm md:order-1">
            <Avatar
              size="xl"
              className="shrink-0 self-center"
              src={user.user.image}
              alt={user.user.name ?? undefined}
              initials={user.user.name?.charAt(0) ?? ""}
            />
            <div className="flex min-w-0 flex-col">
              <span className="inline-flex gap-1 truncate text-lg font-semibold">
                {user.user.name}
              </span>
              <div className="flex gap-2">
                {user.user.discord && (
                  <div className="flex gap-1 truncate text-sm">
                    <DiscordLogoIcon size={16} weight="regular" className="shrink-0 self-center" />
                    <span className="text-muted-fg truncate select-all">{user.user.discord}</span>
                  </div>
                )}
                {user.user.twitter && (
                  <div className="flex gap-1 truncate text-sm">
                    <XLogoIcon size={16} weight="regular" className="shrink-0 self-center" />
                    <span className="text-muted-fg truncate select-all">{user.user.twitter}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Buttons - bottom on mobile, right on desktop */}
        <div className="order-2 flex flex-wrap items-center gap-2 md:order-2">
          <ExternalLink
            className={buttonStyles({
              size: "sm",
              className: "w-auto",
              intent: "outline",
            })}
            href={`https://apollo.cafe/@${user.nickname || user.address}`}
          >
            <ApolloIcon />
            <span className="hidden md:inline">{m.profile_header_view_in_apollo()}</span>
          </ExternalLink>

          {isProfileAuthed && (
            <>
              <EditProfileModal
                address={user.address}
                nickname={nickname}
                open={editOpen}
                setOpen={setEditOpen}
                onSave={onSave}
              />
              <Button
                size="sm"
                intent="outline"
                onPress={() => setEditOpen(true)}
                className="w-auto"
              >
                <PencilSquareIcon />
                <span className="hidden md:inline">{m.profile_header_edit_profile()}</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
