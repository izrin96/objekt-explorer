import type { ComponentProps, ReactNode } from "react";

import { PersonAvatar } from "@/components/shared/person-avatar";
import { SocialBadge } from "@/components/shared/social-badge";
import { TrustLine } from "@/features/offers/trust-line";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export type TradePerson = {
  userId: string;
  identity: { name: string; address: string | null; nickname: string | null };
  user: { image: string | null; discord: string | null; twitter: string | null };
  reputation: ComponentProps<typeof TrustLine>["reputation"];
};

export function TradeHeader({
  person,
  you = false,
  note,
  end,
  className,
}: {
  person: TradePerson;
  you?: boolean;
  /** under the reputation line */
  note?: ReactNode;
  end?: ReactNode;
  className?: string;
}) {
  const { identity, user } = person;

  return (
    <div className={cn("flex items-start gap-x-3", className)}>
      <PersonAvatar name={identity.name} image={user.image} className="size-9 shrink-0" />
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
          {you ? (
            <span className="bg-secondary text-muted-foreground rounded-sm px-1.5 text-xs">
              {m.trade_you_tag()}
            </span>
          ) : null}
          {user.discord ? <SocialBadge platform="discord" username={user.discord} /> : null}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* one line with an ellipsis where the card is wide, wrapping between words on a phone */}
          <TrustLine reputation={person.reputation} className="@3xl:truncate" />
          {note}
        </div>
      </div>
      {end ? <div className="flex shrink-0 items-center gap-2">{end}</div> : null}
    </div>
  );
}
