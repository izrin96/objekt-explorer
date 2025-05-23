"use client";

import React from "react";
import { Avatar, Button, buttonStyles, Link } from "../ui";
import { DiscordLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { PublicProfile } from "@/lib/universal/user";
import { useProfileAuthed } from "@/hooks/use-user";
import { useRouter } from "next/navigation";
import { EditProfile } from "../link/modal/manage-link";

export default function ProfileHeader({ user }: { user: PublicProfile }) {
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
            size: "small",
            className: "w-full md:w-auto flex-none",
            intent: "outline",
          })
        }
        href={`https://apollo.cafe/@${user.nickname}`}
        target="_blank"
      >
        View in Apollo
      </Link>

      {isProfileAuthed && (
        <EditProfile
          address={user.address}
          nickname={user.nickname}
          onComplete={() => {
            router.refresh();
          }}
        >
          {({ open }) => (
            <Button
              size="small"
              intent="outline"
              onClick={open}
              className="w-full md:w-auto flex-none"
            >
              Edit Profile
            </Button>
          )}
        </EditProfile>
      )}

      {user.user && (
        <div className="text-sm flex gap-2 items-center w-full md:w-auto min-w-0">
          <Avatar
            size="extra-large"
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
              <span className="text-sm truncate inline-flex gap-1">
                <DiscordLogoIcon
                  size={16}
                  weight="regular"
                  className="self-center"
                />
                <span>{user.user.discord}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
