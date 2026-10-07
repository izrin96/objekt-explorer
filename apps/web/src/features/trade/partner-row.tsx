import { CaretRightIcon, EyeSlashIcon } from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import type { Dropped } from "@repo/api/lib/trade-rank";
import { CARD_LIMIT } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MessageButton } from "@/features/chat/message-button";
import { getListLinkOption } from "@/features/list/list-link";
import { SafetyMenu } from "@/features/moderation/safety-menu";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { MakeOfferButton } from "@/features/offers/make-offer-button";
import { TrustLine } from "@/features/offers/trust-line";
import { ProfileLink } from "@/features/profile/profile-hover-card";
import { displayNickname } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ListRoleBadge } from "./list-role-badge";
import { THUMB_GRID } from "./thumb-grid";

export type TradePartner = Outputs["trade"]["forYou"]["partners"][number];
export type TradeCollections = Record<string, ValidObjekt | undefined>;

/** theirs first in both places, so the row's summary and the panel read in one order */
const DIRECTIONS = [
  { key: "theyHaveIWant", section: m.trade_section_they_have },
  { key: "iHaveTheyWant", section: m.trade_section_you_have },
] as const;

const REASON: Record<Dropped["reason"], () => string> = {
  not_owned: m.trade_reason_not_owned,
  not_transferable: m.trade_reason_not_transferable,
};

export function PartnerRow({
  partner,
  collections,
  onOpen,
  onHide,
}: {
  partner: TradePartner;
  collections: TradeCollections;
  onOpen: (objekt: ValidObjekt) => void;
  onHide: (partner: TradePartner) => void;
}) {
  const have = partner.theyHaveIWant.length;
  const want = partner.iHaveTheyWant.length;
  const { identity, user } = partner;
  const also = identity.also.map((ref) => displayNickname(ref.address, ref.nickname));

  return (
    <Collapsible>
      {/* the padding rides on the trigger so the whole row is one touch target;
          spans throughout, since a button only takes phrasing content */}
      <CollapsibleTrigger
        className={cn(
          "group focus-visible:ring-ring flex w-full touch-manipulation items-center gap-3 rounded-sm px-4 py-3 text-left outline-none focus-visible:ring-2",
          partner.idle && "text-muted-foreground",
        )}
      >
        <Avatar className="size-9 shrink-0">
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback>{identity.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>

        <span className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span className="flex min-w-0 flex-col gap-1">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <span className="min-w-0 text-base leading-snug font-semibold break-words">
                {identity.name}
              </span>
              {partner.idle ? (
                <Badge variant="outline" size="sm">
                  {m.trade_idle()}
                </Badge>
              ) : null}
            </span>
            <TrustLine reputation={partner.reputation} />
            {also.length > 0 ? (
              <span className="text-muted-foreground text-sm break-words">
                {m.trade_also({ names: also.join(", ") })}
              </span>
            ) : null}
          </span>

          <span className="text-muted-foreground flex shrink-0 flex-wrap items-baseline gap-x-1.5 text-sm whitespace-nowrap tabular-nums sm:justify-end">
            <span className="sr-only">{m.trade_counts_label({ have, want })}</span>
            {/* the dot ends each count, so a wrapped line never starts with one */}
            <span
              aria-hidden
              className="*:not-last:after:text-muted-foreground contents *:not-last:after:ms-1.5 *:not-last:after:font-normal *:not-last:after:content-['·']"
            >
              <span className="text-foreground font-semibold">
                {m.trade_count_mutual({ count: Math.min(have, want) })}
              </span>
              <span>{m.trade_count_they_have({ count: have })}</span>
              <span>{m.trade_count_you_have({ count: want })}</span>
            </span>
          </span>
        </span>

        <CaretRightIcon
          aria-hidden
          className="text-muted-foreground size-4 shrink-0 transition-transform group-data-panel-open:rotate-90"
        />
      </CollapsibleTrigger>

      {/* hiddenUntilFound: find-in-page still reaches a shut partner's matches */}
      <CollapsiblePanel hiddenUntilFound>
        <div className="flex flex-col gap-6 px-4 pt-1 pb-4">
          {partner.idle ? (
            <p className="text-muted-foreground text-sm text-pretty">{m.trade_idle_hint()}</p>
          ) : null}
          <PartnerContact partner={partner} />
          <PartnerLists partner={partner} />

          {DIRECTIONS.map((direction) =>
            partner[direction.key].length > 0 ? (
              <MatchSection
                key={direction.key}
                title={direction.section({ count: partner[direction.key].length })}
              >
                {partner[direction.key].slice(0, CARD_LIMIT).map((match) => (
                  <MatchObjekt
                    key={match.slug}
                    slug={match.slug}
                    collection={collections[match.slug]}
                    onOpen={onOpen}
                  />
                ))}
                <Overflow count={partner[direction.key].length - CARD_LIMIT} />
              </MatchSection>
            ) : null,
          )}

          {partner.dropped.length > 0 ? (
            <MatchSection title={m.trade_not_counted({ count: partner.dropped.length })}>
              {partner.dropped.slice(0, CARD_LIMIT).map((dropped) => (
                <MatchObjekt
                  key={`${dropped.direction}:${dropped.slug}`}
                  slug={dropped.slug}
                  collection={collections[dropped.slug]}
                  caption={REASON[dropped.reason]()}
                  muted
                  onOpen={onOpen}
                />
              ))}
              <Overflow count={partner.dropped.length - CARD_LIMIT} />
            </MatchSection>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2">
            {partner.messageable ? (
              <>
                <MessageButton
                  target={{ kind: "user", userId: partner.userId }}
                  card={bestCard(partner)}
                  name={identity.name}
                  labelClassName="max-sm:sr-only"
                />
                <MakeOfferButton
                  request={{
                    to: { target: { kind: "user", userId: partner.userId } },
                    name: identity.name,
                    suggestFor: partner.userId,
                  }}
                  label={m.offer_propose()}
                  labelClassName="max-sm:sr-only"
                />
              </>
            ) : (
              <span className="text-muted-foreground me-auto text-sm">
                {m.trade_not_messageable()}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => onHide(partner)}>
              <EyeSlashIcon />
              {m.trade_hide()}
            </Button>
            <SafetyMenu userId={partner.userId} name={identity.name} report />
          </div>
        </div>
      </CollapsiblePanel>
    </Collapsible>
  );
}

/**
 * The first collection their best-matching list matched on. The list itself stays off the
 * card: the server takes only a list that shows its owner, which a For you list may not.
 */
function bestCard(partner: TradePartner) {
  const list = partner.lists[0];
  if (!list) return undefined;
  const match = [...partner.theyHaveIWant, ...partner.iHaveTheyWant].find((item) =>
    item.partnerListIds.includes(list.id),
  );
  return match ? { collectionSlug: match.slug } : undefined;
}

/** Kept out of the row's toggle, so the handles can be selected and copied. */
function PartnerContact({ partner }: { partner: TradePartner }) {
  const { identity, user } = partner;
  if (!identity.address && !user.discord && !user.twitter) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {identity.address ? (
        <ProfileLink
          address={identity.address}
          nickname={identity.name}
          className="text-sm font-medium underline-offset-2 hover:underline"
        >
          {m.trade_view_profile()}
          <span className="sr-only"> {identity.name}</span>
        </ProfileLink>
      ) : null}
      {user.discord ? <SocialBadge platform="discord" username={user.discord} /> : null}
      {user.twitter ? <SocialBadge platform="twitter" username={user.twitter} /> : null}
    </div>
  );
}

function PartnerLists({ partner }: { partner: TradePartner }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-muted-foreground text-sm font-medium">{m.trade_their_lists()}</h2>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {partner.lists.map((list) => (
          <li key={list.id} className="flex min-w-0 items-center gap-1.5">
            <Link
              {...getListLinkOption({
                slug: list.slug,
                profileSlug: list.profileSlug,
                profileAddress: list.profileAddress,
                profile: list.profileAddress
                  ? { address: list.profileAddress, nickname: list.profileNickname }
                  : null,
              })}
              className="min-w-0 text-sm font-medium break-words underline-offset-2 hover:underline"
            >
              {list.name}
            </Link>
            <ListRoleBadge type={list.listTypeNew} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function MatchSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-muted-foreground text-sm font-medium tabular-nums">{title}</h2>
      <div className={THUMB_GRID}>{children}</div>
    </section>
  );
}

function Overflow({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div className="bg-muted text-muted-foreground rounded-photocard aspect-photocard grid place-items-center self-start font-mono text-sm tabular-nums">
      +{count}
    </div>
  );
}

function MatchObjekt({
  slug,
  collection,
  caption,
  muted = false,
  onOpen,
}: {
  slug: string;
  collection: ValidObjekt | undefined;
  caption?: string;
  muted?: boolean;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  return (
    <figure className="flex min-w-0 flex-col gap-1 self-start">
      <div className={cn(muted && "opacity-50 grayscale")}>
        {collection ? (
          <ObjektCard
            objekt={collection}
            image="thumbnail"
            captionClassName="text-xs"
            onOpen={() => onOpen(collection)}
          />
        ) : (
          <div className="bg-muted text-muted-foreground rounded-photocard aspect-photocard grid place-items-center p-2 text-center font-mono text-xs leading-snug break-all">
            {slug}
          </div>
        )}
      </div>
      {caption ? (
        <figcaption className="text-muted-foreground text-xs break-words">{caption}</figcaption>
      ) : null}
    </figure>
  );
}
