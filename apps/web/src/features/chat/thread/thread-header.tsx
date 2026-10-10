import { ArrowLeftIcon, BellSlashIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { Ref } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConversationMenu } from "@/features/chat/conversation-menu";
import { mutedLabel } from "@/features/chat/format";
import type { ThreadPage } from "@/features/chat/thread-cache";
import { TrustLine } from "@/features/offers/trust-line";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { m } from "@/paraglide/messages";

export function ThreadHeader({
  conversation,
  headingRef,
  hydrated,
}: {
  conversation: ThreadPage["conversation"];
  headingRef: Ref<HTMLHeadingElement>;
  hydrated: boolean;
}) {
  const { partner, muted } = conversation;
  const name = partner.identity.name;
  return (
    <header className="flex items-center gap-3 border-b px-3 py-2.5 md:px-4">
      <Button
        variant="ghost"
        size="icon-sm"
        className="-ms-1 shrink-0 md:hidden"
        aria-label={m.chat_back()}
        render={<Link to="/messages" search={(prev) => prev} />}
      >
        <ArrowLeftIcon />
      </Button>
      <Avatar className="size-9 shrink-0">
        {partner.user.image ? <AvatarImage src={partner.user.image} alt="" /> : null}
        <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="truncate text-base leading-snug font-semibold outline-none"
        >
          {partner.identity.address ? (
            <ProfileLink
              address={partner.identity.address}
              nickname={partner.identity.nickname}
              className="underline-offset-2 hover:underline"
            >
              {name}
            </ProfileLink>
          ) : (
            name
          )}
        </h2>
        <TrustLine reputation={partner.reputation} className="truncate" />
        {muted ? (
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            <BellSlashIcon aria-hidden className="size-3.5 shrink-0" />
            {/* the exact end is in the viewer's time zone, unknown to the server render */}
            <span className="truncate">{hydrated ? mutedLabel(muted) : m.chat_muted_always()}</span>
          </p>
        ) : null}
      </div>
      <ConversationMenu conversation={conversation} name={name} />
    </header>
  );
}
