"use client";

import React from "react";
import { Avatar, Button } from "../ui";
import { DiscordLogo } from "@phosphor-icons/react/dist/ssr";
import { useListAuthed } from "@/hooks/use-user";
import { EditList } from "./modal/manage-list";
import { PublicList } from "@/lib/server/api/routers/list";
import { useRouter } from "next/navigation";

export default function ListHeader({ list }: { list: PublicList }) {
  const isListAuthed = useListAuthed(list.slug);
  const router = useRouter();
  const { user, name } = list;
  return (
    <div className="flex gap-3 items-center">
      {user && (
        <Avatar
          size="extra-large"
          className="self-center"
          src={user.image}
          alt={user.name}
          initials={user.name.charAt(0)}
        />
      )}
      <div className="flex flex-col">
        <div className="text-lg font-semibold">{name}</div>
        {user && (
          <div className="inline-flex items-center gap-1">
            <DiscordLogo size={16} weight="regular" />
            <span className="text-fg text-sm">{user.name}</span>
            <span className="text-muted-fg text-sm">{user.username}</span>
          </div>
        )}
      </div>

      {isListAuthed && (
        <EditList
          slug={list.slug}
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
              Edit List
            </Button>
          )}
        </EditList>
      )}
    </div>
  );
}
