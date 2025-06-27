"use client";

import React, { useState } from "react";
import { Avatar, Button, buttonStyles, Link } from "../ui";
import { DiscordLogoIcon, XLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { PublicProfile } from "@/lib/universal/user";
import { useProfileAuthed } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { EditProfileModal } from "../link/modal/manage-link";

export default function ProfileHeader({ user }: { user: PublicProfile }) {
  const [editOpen, setEditOpen] = useState(false);
  const isProfileAuthed = useProfileAuthed();
  const router = useRouter();
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 pb-2 md:pb-0 flex-wrap">
      <div className="flex flex-col w-full md:w-auto">
        <div className="text-xl font-semibold">{user.nickname}</div>
        <div className="text-xs text-muted-fg truncate">{user.address}</div>
      </div>

      <Link
        className={(renderProps) =>
          buttonStyles({
            ...renderProps,
            size: "sm",
            className: "w-full md:w-auto flex-none",
            intent: "outline",
          })
        }
        href={`https://apollo.cafe/@${
          user.isAddress ? user.address : user.nickname
        }`}
        target="_blank"
      >
        View in Apollo
      </Link>

      {isProfileAuthed && (
        <>
          <EditProfileModal
            address={user.address}
            nickname={user.nickname}
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
            className="w-full md:w-auto flex-none"
          >
            Edit Profile
          </Button>
        </>
      )}

      {user.user && (
        <div className="text-sm flex gap-2 items-center w-full md:w-auto min-w-0">
          <Avatar
            size="xl"
            className="self-center"
            src={user.user.image}
            alt={user.user.name}
            initials={user.user.name.charAt(0)}
          />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-lg truncate inline-flex gap-1">
              {user.user.name}
            </span>
            {user.user.showSocial && (
              <div className="flex gap-2">
                {user.user.discord && (
                  <div className="text-sm truncate flex gap-1">
                    <DiscordLogoIcon
                      size={16}
                      weight="regular"
                      className="self-center"
                    />
                    <span className="text-muted-fg">{user.user.discord}</span>
                  </div>
                )}
                {user.user.twitter && (
                  <div className="text-sm truncate flex gap-1">
                    <XLogoIcon
                      size={16}
                      weight="regular"
                      className="self-center"
                    />
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
