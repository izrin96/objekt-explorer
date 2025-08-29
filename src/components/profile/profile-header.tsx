"use client";

import { DiscordLogoIcon, XLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProfileAuthed } from "@/hooks/use-user";
import type { PublicProfile } from "@/lib/universal/user";
import { parseNickname } from "@/lib/utils";
import { EditProfileModal } from "../link/modal/manage-link";
import { Avatar, Button, buttonStyles, Link } from "../ui";

export default function ProfileHeader({ user }: { user: PublicProfile }) {
  const [editOpen, setEditOpen] = useState(false);
  const isProfileAuthed = useProfileAuthed();
  const router = useRouter();
  const nickname = parseNickname(user.address, user.nickname);
  return (
    <div className="flex flex-col flex-wrap items-start gap-4 pb-2 md:flex-row md:items-center md:pb-0">
      <div className="flex w-full flex-col md:w-auto">
        <div className="font-semibold text-xl">{nickname}</div>
        <div className="truncate font-mono text-muted-fg text-xs">{user.address}</div>
      </div>

      <Link
        className={(renderProps) =>
          buttonStyles({
            ...renderProps,
            size: "sm",
            className: "w-full flex-none md:w-auto",
            intent: "outline",
          })
        }
        href={`https://apollo.cafe/@${user.nickname ?? user.address}`}
        target="_blank"
      >
        View in Apollo
      </Link>

      {isProfileAuthed && (
        <>
          <EditProfileModal
            address={user.address}
            nickname={nickname}
            onComplete={() => {
              router.refresh();
            }}
            open={editOpen}
            setOpen={setEditOpen}
          />
          <Button
            size="sm"
            intent="outline"
            onClick={() => setEditOpen(true)}
            className="w-full flex-none md:w-auto"
          >
            Edit Profile
          </Button>
        </>
      )}

      {user.user && (
        <div className="flex w-full min-w-0 items-center gap-2 text-sm md:w-auto">
          <Avatar
            size="xl"
            className="self-center"
            src={user.user.image}
            alt={user.user.name}
            initials={user.user.name.charAt(0)}
          />
          <div className="flex min-w-0 flex-col">
            <span className="inline-flex gap-1 truncate font-semibold text-lg">
              {user.user.name}
            </span>
            {user.user.showSocial && (
              <div className="flex gap-2">
                {user.user.discord && (
                  <div className="flex gap-1 truncate text-sm">
                    <DiscordLogoIcon size={16} weight="regular" className="self-center" />
                    <span className="text-muted-fg">{user.user.discord}</span>
                  </div>
                )}
                {user.user.twitter && (
                  <div className="flex gap-1 truncate text-sm">
                    <XLogoIcon size={16} weight="regular" className="self-center" />
                    <span className="text-muted-fg">{user.user.twitter}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
