import type { CardInput, ChatTarget } from "@repo/api/schemas/chat";
import type { ComponentProps, ReactNode } from "react";

import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageButton } from "@/features/chat/message-button";
import { SafetyMenu } from "@/features/moderation/safety-menu";
import { MakeOfferButton } from "@/features/offers/make-offer-button";
import type { OfferRequest } from "@/features/offers/offer-builder";
import { TrustLine } from "@/features/offers/trust-line";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

type Person = {
  userId: string;
  identity: { name: string; address: string | null; nickname: string | null };
  user: { image: string | null; discord: string | null; twitter: string | null };
  reputation: ComponentProps<typeof TrustLine>["reputation"];
};

/** The viewer's own post shows no Message, and no note saying so. */
export type TradeContact =
  | {
      kind: "open";
      target: ChatTarget;
      card?: CardInput;
      offer?: Pick<OfferRequest, "suggestFor" | "focusList" | "focusWantList">;
    }
  | { kind: "own" }
  | { kind: "closed" };

/** Someone the viewer could trade with: a post on Browse, a partner on For you. */
export function TradeCard({
  person,
  meta,
  contact,
  menuItems,
  match,
  children,
  className,
  ...props
}: Omit<ComponentProps<"article">, "children"> & {
  person: Person;
  meta: ReactNode;
  contact: TradeContact;
  menuItems?: ReactNode;
  match: ReactNode;
  children: ReactNode;
}) {
  const { identity, user } = person;

  return (
    <article
      className={cn("bg-card flex flex-col gap-4 rounded-lg border p-4", className)}
      {...props}
    >
      <header className="flex flex-wrap items-start gap-3">
        <Avatar className="size-9 shrink-0">
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback>{identity.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="min-w-0 text-base leading-snug font-semibold break-words">
              {identity.address ? (
                <ProfileLink
                  address={identity.address}
                  nickname={identity.nickname}
                  className="underline-offset-2 hover:underline"
                >
                  {identity.name}
                </ProfileLink>
              ) : (
                identity.name
              )}
            </h2>
            {user.discord ? <SocialBadge platform="discord" username={user.discord} /> : null}
            {user.twitter ? <SocialBadge platform="twitter" username={user.twitter} /> : null}
          </div>
          <TrustLine reputation={person.reputation} />
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {meta}
          </div>
        </div>
        {/* below `sm` these take a row of their own under the name, and ⋯ stays at the top right */}
        {contact.kind !== "own" ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:order-last max-sm:w-full max-sm:ps-12">
            {contact.kind === "open" ? (
              <>
                <MessageButton target={contact.target} card={contact.card} name={identity.name} />
                <MakeOfferButton
                  request={{
                    to: { target: contact.target },
                    name: identity.name,
                    ...contact.offer,
                  }}
                />
              </>
            ) : (
              <span className="text-muted-foreground text-sm">{m.trade_not_messageable()}</span>
            )}
          </div>
        ) : null}
        <SafetyMenu
          userId={person.userId}
          name={identity.name}
          report
          extraItems={menuItems}
          className="shrink-0 sm:-ms-1"
        />
      </header>

      {match}
      {children}
    </article>
  );
}
