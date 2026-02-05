"use client";

import { CopyIcon, DiscordLogoIcon, XLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import type { PublicProfile } from "@/lib/universal/user";

import { useProfileAuthed } from "@/hooks/use-user";
import { parseNickname } from "@/lib/utils";

import { EditProfileModal } from "../link/modal/manage-link";
import { Avatar } from "../ui/avatar-custom";
import { Button, buttonStyles } from "../ui/button";
import { Link } from "../ui/link";

export default function ProfileHeader({ user }: { user: PublicProfile }) {
  const [, copy] = useCopyToClipboard();
  const [editOpen, setEditOpen] = useState(false);
  const isProfileAuthed = useProfileAuthed();
  const nickname = parseNickname(user.address, user.nickname);

  return (
    <div className="flex flex-col flex-wrap items-start gap-4 pb-2 md:flex-row md:items-center md:pb-0">
      <div className="flex w-full flex-col md:w-auto">
        <div className="text-xl font-semibold">{nickname}</div>
        <div className="text-muted-fg inline-flex gap-1 truncate font-mono text-xs">
          {user.address}{" "}
          <CopyIcon
            size={14}
            className="text-fg cursor-pointer"
            onClick={async () => {
              await copy(user.address);
              toast.success("Address copied");
            }}
          />
        </div>
      </div>

      <Link
        className={buttonStyles({
          size: "sm",
          className: "w-full flex-none md:w-auto",
          intent: "outline",
        })}
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
            open={editOpen}
            setOpen={setEditOpen}
          />
          <Button
            size="sm"
            intent="outline"
            onPress={() => setEditOpen(true)}
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
            <span className="inline-flex gap-1 truncate text-lg font-semibold">
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
