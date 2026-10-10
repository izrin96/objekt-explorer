import type { ComponentProps, ReactNode } from "react";

import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SafetyMenu } from "@/features/moderation/safety-menu";
import { TrustLine } from "@/features/offers/trust-line";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { cn } from "@/lib/utils";

export type TradePerson = {
  userId: string;
  identity: { name: string; address: string | null; nickname: string | null };
  user: { image: string | null; discord: string | null; twitter: string | null };
  reputation: ComponentProps<typeof TrustLine>["reputation"];
};

/**
 * Who a post or a partner row belongs to. `end` sits before the ⋯ menu: tags on Browse, the
 * chip and lists on For you. Below `sm` it takes a row of its own under the name.
 */
export function TradeHeader({
  person,
  note,
  end,
  className,
}: {
  person: TradePerson;
  /** under the reputation line */
  note?: ReactNode;
  end?: ReactNode;
  className?: string;
}) {
  const { identity, user } = person;

  return (
    <div className={cn("flex flex-wrap items-start gap-x-3 gap-y-2", className)}>
      <Avatar className="size-9 shrink-0">
        {user.image ? <AvatarImage src={user.image} alt="" /> : null}
        <AvatarFallback>{identity.name.slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
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
        {note}
      </div>
      {end ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2 max-sm:order-last max-sm:w-full max-sm:ps-12">
          {end}
        </div>
      ) : null}
      <SafetyMenu
        userId={person.userId}
        name={identity.name}
        report
        className="shrink-0 sm:-ms-1"
      />
    </div>
  );
}
