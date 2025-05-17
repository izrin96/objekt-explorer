"use client";

import React from "react";
import { Avatar, Button, buttonStyles, Link } from "../ui";
import { DiscordLogo } from "@phosphor-icons/react/dist/ssr";
import { PublicProfile } from "@/lib/universal/user";
import { useProfileAuthed } from "@/hooks/use-user";
import { EditProfile } from "../link/my-link";
import { useRouter } from "next/navigation";

export default function ProfileHeader({ user }: { user: PublicProfile }) {
  const isProfileAuthed = useProfileAuthed();
  const router = useRouter();
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-2 sm:pb-0">
      <div className="flex flex-col w-full sm:w-auto">
        <div className="text-xl font-semibold">{user.nickname}</div>
        <div className="text-xs text-muted-fg truncate">{user.address}</div>
      </div>

      <Link
        className={(renderProps) =>
          buttonStyles({
            ...renderProps,
            size: "small",
            className: "w-full sm:w-auto flex-none",
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
              className="w-full sm:w-auto flex-none"
            >
              Edit Profile
            </Button>
          )}
        </EditProfile>
      )}

      {user.user && (
        <div className="text-sm flex gap-2 items-center w-full sm:w-auto min-w-0">
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
            <span className="text-sm truncate inline-flex gap-1">
              <DiscordLogo size={16} weight="regular" className="self-center" />
              <span>{user.user.username}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
