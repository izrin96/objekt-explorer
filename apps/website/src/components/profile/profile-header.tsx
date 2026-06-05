import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";

import { useProfileAuthed } from "@/hooks/use-user";
import type { PublicProfile } from "@/lib/universal/user";
import { parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { Avatar } from "../intentui/avatar-custom";
import { Button, buttonStyles } from "../intentui/button";
import { ExternalLink } from "../intentui/link";
import { EditProfileModal } from "../link/modal/edit-profile-modal";
import { ApolloIcon } from "../shared/apollo-icon";
import { Badge } from "../shared/badge";
import { CopyButton } from "../shared/copy-button";
import { SocialBadge } from "../shared/social-badge";

export default function ProfileHeader({ user }: { user: PublicProfile }) {
  const ref = useRef<HTMLDivElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const isProfileAuthed = useProfileAuthed();
  const nickname = parseNickname(user.address, user.nickname);

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
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto]" ref={ref}>
      {/* Identity: nickname + address */}
      <div className="order-1 flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="font-display truncate text-xl font-semibold">{nickname}</h2>
          {user.verified && (
            <Badge className="border-border bg-muted text-muted-fg">
              {m.profile_header_verified()}
            </Badge>
          )}
        </div>
        <div className="text-muted-fg inline-flex min-w-0 items-center gap-1 font-mono text-xs">
          <span className="truncate">{user.address}</span>
          <CopyButton
            text={user.address}
            ariaLabel={m.profile_header_address_copied()}
            toastMessage={m.profile_header_address_copied()}
          />
        </div>
      </div>

      {/* Right column: buttons + user info */}
      <div className="order-2 flex flex-col gap-4 sm:flex-row sm:items-end">
        {/* User info - top on mobile, left on desktop */}
        {user.user && (
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Avatar
              size="xl"
              className="shrink-0"
              src={user.user.image}
              alt={user.user.name ?? undefined}
              initials={user.user.name?.charAt(0) ?? ""}
            />
            <div className="flex min-w-0 flex-col">
              <span className="font-display inline-flex truncate text-base font-semibold">
                {user.user.name}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {user.user.discord && (
                  <SocialBadge platform="discord" username={user.user.discord} />
                )}
                {user.user.twitter && (
                  <SocialBadge platform="twitter" username={user.user.twitter} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Buttons - bottom on mobile, right on desktop */}
        <div className="flex flex-wrap items-center gap-2">
          <ExternalLink
            aria-label={m.profile_header_view_in_apollo()}
            className={buttonStyles({
              size: "sm",
              className: "w-auto",
              intent: "outline",
            })}
            href={`https://apollo.cafe/@${user.nickname || user.address}`}
          >
            <ApolloIcon />
            <span className="hidden lg:inline">{m.profile_header_view_in_apollo()}</span>
          </ExternalLink>

          {isProfileAuthed && (
            <>
              <EditProfileModal
                address={user.address}
                nickname={nickname}
                open={editOpen}
                setOpen={setEditOpen}
              />
              <Button
                size="sm"
                intent="outline"
                onPress={() => setEditOpen(true)}
                aria-label={m.profile_header_edit_profile()}
                className="w-auto"
              >
                <PencilSquareIcon />
                <span className="hidden lg:inline">{m.profile_header_edit_profile()}</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
