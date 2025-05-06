"use client";

import React from "react";
import { Avatar, buttonStyles, Link } from "../ui";
import { DiscordLogo } from "@phosphor-icons/react/dist/ssr";
import { PublicProfile } from "@/lib/universal/user";

export default function ProfileHeader({ user }: { user: PublicProfile }) {
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
            size: "extra-small",
            className: "w-full sm:w-auto flex-none",
            intent: "secondary",
          })
        }
        href={`https://apollo.cafe/@${user.address}`}
        target="_blank"
      >
        View in Apollo
      </Link>

      {user.user && (
        <div className="text-sm flex gap-2 items-center w-full sm:w-auto min-w-0">
          {/* <div className="rounded-full bg-indigo-400 p-2 text-white">
            <DiscordLogo size={24} weight="regular" />
          </div> */}
          <Avatar
            size="extra-large"
            className="self-center"
            src={user.user.image}
            alt={user.user.name}
            initials={user.user.name.charAt(0)}
          />
          <div className="flex flex-col min-w-0">
            <span className="font-semibold text-lg truncate inline-flex gap-1">
              <DiscordLogo size={18} weight="regular" className="self-center" />
              {user.user.name}
            </span>
            <span className="text-xs truncate">{user.user.username}</span>
          </div>
        </div>
      )}
    </div>
  );
}
