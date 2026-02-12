"use client";

import { ArrowLeftIcon, DiscordLogoIcon, XLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState } from "react";

import { useTarget } from "@/hooks/use-target";
import { useListAuthed } from "@/hooks/use-user";

import { Avatar } from "../ui/avatar-custom";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { EditListModal } from "./modal/manage-list";

export default function ListHeader() {
  const list = useTarget((a) => a.list)!;
  const profile = useTarget((a) => a.profile);
  const isListAuthed = useListAuthed();
  const t = useTranslations("list");

  const isProfileList = list.listType === "profile";
  const isProfileContext = isProfileList || (list.listType === "normal" && list.displayProfileAddress);

  // Use profile info when in profile context
  const displayUser = isProfileContext && profile ? profile.user : list.user;

  return (
    <div className="flex flex-col gap-4">
      {/* Back button for profile context */}
      {isProfileContext && profile && (
        <Link
          href={`/@${profile.nickname || profile.address}`}
          className="inline-flex w-fit items-center gap-2 text-sm hover:underline"
        >
          <ArrowLeftIcon size={16} weight="bold" />
          {t("back_to_profile", { name: profile.nickname || profile.address })}
        </Link>
      )}

      <div className="flex flex-col flex-wrap items-start gap-4 sm:flex-row sm:items-center">
        {/* Profile context: show nickname/address without avatar */}
        {isProfileContext && profile ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">{list.name}</span>
              <Badge>{isProfileList ? t("profile_list_badge") : t("bound_list_badge")}</Badge>
            </div>
            <div className="text-muted-fg text-sm">
              {t("profile_context", {
                nickname: profile.nickname || "—",
                address: `${profile.address.slice(0, 6)}...${profile.address.slice(profile.address.length - 4, profile.address.length)}`,
              })}
            </div>
          </div>
        ) : (
          /* Account context: show avatar + user info (existing) */
          <div className="flex items-center gap-3">
            {displayUser && (
              <Avatar
                size="xl"
                className="self-center"
                src={displayUser.image}
                alt={displayUser.name}
                initials={displayUser.name.charAt(0)}
              />
            )}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{list.name}</span>
              </div>
              {displayUser && (
                <div className="flex items-center gap-2">
                  <span className="text-fg text-sm">{displayUser.name}</span>
                  {displayUser.showSocial && (
                    <>
                      {displayUser.discord && (
                        <div className="flex gap-1">
                          <span className="text-muted-fg text-sm">{displayUser.discord}</span>
                          <DiscordLogoIcon className="self-center" size={16} weight="regular" />
                        </div>
                      )}
                      {displayUser.twitter && (
                        <div className="flex gap-1">
                          <span className="text-muted-fg text-sm">{displayUser.twitter}</span>
                          <XLogoIcon className="self-center" size={16} weight="regular" />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {isListAuthed && <EditList slug={list.slug} />}
      </div>
    </div>
  );
}

function EditList({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("list.card");
  return (
    <>
      <EditListModal slug={slug} open={open} setOpen={setOpen} />
      <Button
        size="sm"
        intent="outline"
        onPress={() => setOpen(true)}
        className="w-full flex-none sm:w-auto"
      >
        {t("edit_list")}
      </Button>
    </>
  );
}
