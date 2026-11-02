import type { ComponentProps, ReactNode } from "react";

import { SocialBadge } from "@/components/shared/social-badge";
import { TrustLine } from "@/features/offers/trust-line";
import { OnlineAvatar } from "@/features/presence/online-avatar";
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
  handle,
  meta,
  badge,
  note,
  className,
}: {
  person: TradePerson;
  you?: boolean;
  /** shown muted after the name, as "@handle"; the caller passes it only where it differs */
  handle?: string;
  /** on the reputation line, after it */
  meta?: ReactNode;
  /** after the name */
  badge?: ReactNode;
  /** under the reputation line */
  note?: ReactNode;
  className?: string;
}) {
  const { identity, user } = person;

  return (
    <div className={cn("flex items-start gap-x-3", className)}>
      <OnlineAvatar
        userId={you ? undefined : person.userId}
        name={identity.name}
        image={user.image}
        className="size-9 shrink-0"
      />
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
          {handle ? (
            <span className="text-muted-foreground min-w-0 text-xs break-all">@{handle}</span>
          ) : null}
          {badge}
          {you ? (
            <span className="bg-secondary text-muted-foreground rounded-sm px-1.5 text-xs">
              {m.trade_you_tag()}
            </span>
          ) : null}
          {user.discord ? <SocialBadge platform="discord" username={user.discord} /> : null}
          {user.twitter ? <SocialBadge platform="twitter" username={user.twitter} /> : null}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* wraps between " · " segments, so beside the owner's buttons nothing is cut off */}
          <span className="text-muted-foreground block text-xs text-pretty tabular-nums">
            <TrustLine reputation={person.reputation} className="inline" />
            {meta ? (
              <>
                {person.reputation ? " · " : null}
                {meta}
              </>
            ) : null}
          </span>
          {note}
        </div>
      </div>
    </div>
  );
}
