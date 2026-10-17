import type { ComponentProps, ReactNode } from "react";

import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  socials,
  you = false,
  note,
  phoneLine,
  wrapTrust = false,
  end,
  className,
}: {
  person: TradePerson;
  /** which of the owner's badges show: a post keeps to Discord, the person sheet shows both */
  socials: "discord" | "all";
  you?: boolean;
  /** under the reputation line */
  note?: ReactNode;
  /** in a narrow card, one monospace line that wraps between its parts in place of the reputation line and `note` */
  phoneLine?: ReactNode;
  /** let the reputation line wrap instead of truncating */
  wrapTrust?: boolean;
  end?: ReactNode;
  className?: string;
}) {
  const { identity, user } = person;

  return (
    <div className={cn("flex items-start gap-x-3", className)}>
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
          {you ? (
            <span className="bg-secondary text-muted-foreground rounded-sm px-1.5 text-xs">
              {m.trade_you_tag()}
            </span>
          ) : null}
          {user.discord ? <SocialBadge platform="discord" username={user.discord} /> : null}
          {socials === "all" && user.twitter ? (
            <SocialBadge platform="twitter" username={user.twitter} />
          ) : null}
        </div>
        <div className={cn("flex min-w-0 flex-col gap-0.5", phoneLine && "@max-3xl:hidden")}>
          <TrustLine
            reputation={person.reputation}
            className={wrapTrust ? undefined : "truncate"}
          />
          {note}
        </div>
        {phoneLine ? (
          <p className="text-muted-foreground font-mono text-xs @3xl:hidden">{phoneLine}</p>
        ) : null}
      </div>
      {end ? <div className="flex shrink-0 items-center gap-2">{end}</div> : null}
    </div>
  );
}
