import { ChatCircleIcon } from "@phosphor-icons/react";
import type { TradeView as Trade } from "@repo/api/schemas/offer";
import type { Reputation } from "@repo/api/schemas/reputation";
import { Link } from "@tanstack/react-router";
import { useId } from "react";

import { CopyButton } from "@/components/shared/copy-button";
import { PersonAvatar } from "@/components/shared/person-avatar";
import { Button } from "@/components/ui/button";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { nicknameParam } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";

import { Mono, MonoMessage } from "./mono";
import type { Primary } from "./next-step";
import { TradeMenu } from "./trade-menu";
import { TrustLine, sinceLabel } from "./trust-line";

type Props = {
  trade: Trade;
  primary: Primary;
  hydrated: boolean;
  onReport: () => void;
  onCancel: () => void;
};

const isNew = (reputation: Reputation) => reputation.verified === 0 && reputation.unfinished === 0;

function Name({ trade, className }: { trade: Trade; className?: string }) {
  const { name, address, nickname } = trade.partner.identity;
  return (
    <span className="flex min-w-0 items-center gap-1">
      {address ? (
        <ProfileLink
          address={address}
          nickname={nickname}
          className={cn("truncate underline-offset-2 hover:underline", className)}
        >
          {name}
        </ProfileLink>
      ) : (
        <span className={cn("truncate", className)}>{name}</span>
      )}
      {address ? (
        <CopyButton
          text={address}
          label={m.offer_copy_address()}
          toastTitle={m.profile_header_address_copied()}
        />
      ) : null}
    </span>
  );
}

function ViewProfile({ trade, className }: { trade: Trade; className?: string }) {
  const { address, nickname } = trade.partner.identity;
  if (!address) return null;
  return (
    <Button
      variant="outline"
      className={className}
      render={<Link to="/@{$nickname}" params={{ nickname: nicknameParam(address, nickname) }} />}
    >
      {m.offer_view_profile()}
    </Button>
  );
}

/** Verified, unfinished and positive as three figures; unfinished in amber once above zero. */
function Figures({ reputation }: { reputation: Reputation }) {
  const locale = getLocale();
  const figures = [
    {
      key: "verified",
      label: m.offer_rep_verified(),
      value: reputation.verified.toLocaleString(locale),
    },
    {
      key: "unfinished",
      label: m.offer_rep_unfinished(),
      value: reputation.unfinished.toLocaleString(locale),
      warn: reputation.unfinished > 0,
    },
    {
      key: "positive",
      label: m.offer_rep_positive(),
      value: reputation.positive === null ? "–" : `${reputation.positive}%`,
    },
  ];
  return (
    <dl className="grid grid-cols-3 gap-2">
      {figures.map((figure) => (
        <div key={figure.key} className="bg-muted flex flex-col rounded-lg p-2.5">
          <dt className="text-muted-foreground truncate text-xs">{figure.label}</dt>
          <dd
            className={cn(
              "font-mono text-base font-semibold tabular-nums",
              figure.warn && "text-warning-foreground",
            )}
            title={figure.warn ? m.trust_unfinished_hint() : undefined}
          >
            {figure.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** The side panel's first card: who the trade is with, their record, and the ways to reach them. */
export function TradePartnerCard({ trade, primary, hydrated, onReport, onCancel }: Props) {
  const titleId = useId();
  const { reputation, user } = trade.partner;
  return (
    <section
      aria-labelledby={titleId}
      className="bg-card flex flex-col gap-3.5 rounded-xl border p-4"
    >
      <h2 id={titleId} className="text-muted-foreground text-xs font-medium">
        {m.offer_partner_title()}
      </h2>
      <div className="flex items-center gap-3">
        <PersonAvatar
          name={trade.partner.identity.name}
          image={user.image}
          className="size-11 shrink-0"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <Name trade={trade} className="font-mono text-base font-semibold" />
          {reputation ? (
            <span className="text-muted-foreground text-xs">
              {m.offer_partner_since({ month: sinceLabel(reputation.since) })}
            </span>
          ) : null}
        </div>
      </div>
      {reputation ? (
        isNew(reputation) ? (
          <TrustLine reputation={reputation} variant="compact" className="self-start" />
        ) : (
          <Figures reputation={reputation} />
        )
      ) : null}
      <div className="flex gap-2">
        <Button
          variant={primary ? "outline" : "default"}
          className="min-w-0 flex-1"
          render={<Link to="/messages/$id" params={{ id: String(trade.conversationId) }} />}
        >
          <ChatCircleIcon />
          {m.offer_open_chat()}
        </Button>
        <ViewProfile trade={trade} />
        <TradeMenu trade={trade} hydrated={hydrated} onReport={onReport} onCancel={onCancel} />
      </div>
    </section>
  );
}

/** The phone's row: avatar, name, the record on one line, and View profile; the bar holds the rest. */
export function TradePartnerRow({ trade }: { trade: Trade }) {
  const { reputation, user } = trade.partner;
  const locale = getLocale();
  return (
    <section
      aria-label={m.offer_partner_title()}
      className="bg-card flex items-center gap-3 rounded-xl border px-4 py-3.5"
    >
      <PersonAvatar
        name={trade.partner.identity.name}
        image={user.image}
        className="size-9 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Name trade={trade} className="font-mono font-semibold" />
        {reputation ? (
          isNew(reputation) ? (
            <TrustLine reputation={reputation} variant="compact" className="self-start" />
          ) : (
            <span className="text-muted-foreground text-xs tabular-nums">
              <MonoMessage
                values={[reputation.verified.toLocaleString(locale)]}
                text={([count]) => m.trust_verified({ count: count! })}
              />
              {reputation.unfinished > 0 ? (
                <>
                  {" · "}
                  <span className="text-warning-foreground" title={m.trust_unfinished_hint()}>
                    <MonoMessage
                      values={[reputation.unfinished.toLocaleString(locale)]}
                      text={([count]) => m.trust_unfinished({ count: count! })}
                    />
                  </span>
                </>
              ) : null}
              {reputation.positive !== null ? (
                <>
                  {" · "}
                  <Mono aria-hidden>{`${reputation.positive}%`}</Mono>
                  <span className="sr-only">
                    {m.trust_positive({ percent: reputation.positive })}
                  </span>
                </>
              ) : null}
            </span>
          )
        ) : null}
      </div>
      <ViewProfile trade={trade} className="h-11 shrink-0" />
    </section>
  );
}
