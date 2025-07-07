"use client";

import { DiscordLogoIcon, XLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useListAuthed } from "@/hooks/use-user";
import type { PublicList } from "@/lib/universal/user";
import { Avatar, Button } from "../ui";
import { EditListModal } from "./modal/manage-list";

export default function ListHeader({ list }: { list: PublicList }) {
  const isListAuthed = useListAuthed(list.slug);
  const { user, name } = list;
  return (
    <div className="flex flex-col flex-wrap items-start gap-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        {user && (
          <Avatar
            size="xl"
            className="self-center"
            src={user.image}
            alt={user.name}
            initials={user.name.charAt(0)}
          />
        )}
        <div className="flex flex-col">
          <div className="font-semibold text-lg">{name}</div>
          {user && (
            <div className="flex items-center gap-2">
              <span className="text-fg text-sm">{user.name}</span>
              {user.showSocial && (
                <>
                  {user.discord && (
                    <div className="flex gap-1">
                      <span className="text-muted-fg text-sm">{user.discord}</span>
                      <DiscordLogoIcon className="self-center" size={16} weight="regular" />
                    </div>
                  )}
                  {user.twitter && (
                    <div className="flex gap-1">
                      <span className="text-muted-fg text-sm">{user.twitter}</span>
                      <XLogoIcon className="self-center" size={16} weight="regular" />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {isListAuthed && <EditList slug={list.slug} />}
    </div>
  );
}

function EditList({ slug }: { slug: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <EditListModal
        slug={slug}
        onComplete={() => {
          router.refresh();
        }}
        open={open}
        setOpen={setOpen}
      />
      <Button
        size="sm"
        intent="outline"
        onClick={() => setOpen(true)}
        className="w-full flex-none sm:w-auto"
      >
        Edit List
      </Button>
    </>
  );
}
