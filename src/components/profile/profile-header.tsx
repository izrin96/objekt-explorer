"use client";

import { CosmoPublicUser } from "@/lib/universal/cosmo/auth";
import React from "react";
import { buttonStyles, Link } from "../ui";

export default function ProfileHeader({ user }: { user: CosmoPublicUser }) {
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
            className: "w-full sm:w-auto",
            intent: "secondary",
          })
        }
        href={`https://apollo.cafe/@${user.nickname}`}
        target="_blank"
      >
        View in Apollo
      </Link>
    </div>
  );
}
