import { EyeSlashIcon } from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { Badge } from "@/components/ui/badge";
import { MenuItem } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getListLinkOption } from "@/features/list/list-link";
import { SafetyMenu } from "@/features/moderation/safety-menu";
import { displayNickname } from "@/lib/address";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ListsPopover } from "./lists-popover";
import { MATCH_TONE, MatchChip } from "./match-chip";
import { MatchedLists } from "./matched-lists";
import { PostStrip, STRIP_MORE, StripMore } from "./post-side";
import { TILE } from "./thumb-grid";
import { TradeActions, type TradeContact } from "./trade-actions";
import { TradeHeader } from "./trade-header";
import { TradeRow, TradeSides } from "./trade-row";

export type TradePartner = Outputs["trade"]["forYou"]["partners"][number];
export type TradeCollections = Record<string, ValidObjekt | undefined>;

/** theirs first, as the chip reads */
const DIRECTIONS = [
  { key: "theyHaveIWant", section: m.trade_section_they_have, tone: MATCH_TONE.theyHave },
  { key: "iHaveTheyWant", section: m.trade_section_you_have, tone: MATCH_TONE.youHave },
] as const;

export function PartnerRow({
  id,
  partner,
  now,
  collections,
  onOpen,
  onHide,
}: {
  id: string;
  partner: TradePartner;
  /** undefined until hydration */
  now: number | undefined;
  collections: TradeCollections;
  onOpen: (objekt: ValidObjekt) => void;
  onHide: (partner: TradePartner) => void;
}) {
  const { identity } = partner;
  const also = identity.also.map((ref) => displayNickname(ref.address, ref.nickname));
  const match = matchedLists(partner);
  const contact: TradeContact = partner.messageable
    ? {
        kind: "open",
        target: { kind: "user", userId: partner.userId },
        card: bestCard(partner),
        offer: { suggestFor: partner.userId },
      }
    : { kind: "closed" };

  return (
    <TradeRow
      id={id}
      // `data-highlight` is set for a moment when a Browse link lands here
      className="data-highlight:ring-ring scroll-mt-20 transition-shadow duration-700 data-highlight:ring-2 motion-reduce:transition-none"
      byline={
        <TradeHeader
          person={partner}
          note={
            <>
              <time
                dateTime={partner.updatedAt}
                className="text-muted-foreground block min-h-4 font-mono text-xs"
              >
                {now !== undefined
                  ? m.trade_partner_updated({
                      time: relativeTime(Math.min(Date.parse(partner.updatedAt), now), now),
                    })
                  : null}
              </time>
              {also.length > 0 ? (
                <span className="text-muted-foreground block text-xs break-words">
                  {m.trade_also({ names: also.join(", ") })}
                </span>
              ) : null}
            </>
          }
        />
      }
      below={
        <div className="flex flex-wrap items-center gap-2">
          <MatchChip counts={match.counts} popover={<MatchedLists {...match} />} />
          <ListsPopover
            lists={partner.lists.map((list) => ({
              id: list.id,
              name: list.name,
              type: list.listTypeNew,
              link: getListLinkOption({
                slug: list.slug,
                profileSlug: list.profileSlug,
                profileAddress: list.profileAddress,
                profile: list.profileAddress
                  ? { address: list.profileAddress, nickname: list.profileNickname }
                  : null,
              }),
            }))}
          />
          {partner.idle ? (
            <Badge variant="outline" size="sm">
              {m.trade_idle()}
            </Badge>
          ) : null}
        </div>
      }
      sides={
        <TradeSides
          strips={DIRECTIONS.map((direction) => (
            <PostStrip
              key={direction.key}
              label={direction.section({ count: partner[direction.key].length })}
              tone={direction.tone}
              items={partner[direction.key].map((item) => ({ key: item.slug, slug: item.slug }))}
              collections={collections}
              onOpen={onOpen}
              more={(count) => (
                <div className={cn(TILE, STRIP_MORE, "w-full")}>
                  <StripMore count={count} />
                </div>
              )}
            />
          ))}
        />
      }
      actions={
        <>
          <TradeActions contact={contact} name={identity.name} compact />
          <SafetyMenu
            userId={partner.userId}
            name={identity.name}
            report
            extraItems={
              <MenuItem onClick={() => onHide(partner)}>
                <EyeSlashIcon />
                {m.trade_hide_partner()}
              </MenuItem>
            }
          />
        </>
      }
    />
  );
}

/** A row's shape (byline, two strips, chip, actions), so the list lands in place. */
export function PartnerRowSkeleton() {
  return (
    <TradeRow
      byline={
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      }
      below={<Skeleton className="h-6 w-28 rounded-md" />}
      sides={
        <TradeSides
          strips={[0, 1].map((column) => (
            <div key={column} className="flex flex-col gap-1">
              <Skeleton className="h-3 w-36" />
              <div className="flex gap-x-1.5">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton
                    key={index}
                    className="aspect-photocard rounded-photocard w-14 shrink-0"
                  />
                ))}
              </div>
            </div>
          ))}
        />
      }
      actions={
        <>
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="size-8 shrink-0 rounded-md" />
        </>
      }
    />
  );
}

/** The same shape Browse's `person` has, so both tabs open the same Matched with your lists popover. */
function matchedLists(partner: TradePartner) {
  const listIdsOf = (matches: TradePartner["theyHaveIWant"]) => [
    ...new Set(matches.flatMap((match) => match.myListIds)),
  ];
  return {
    counts: partner.counts,
    wantListIds: listIdsOf(partner.theyHaveIWant),
    haveListIds: listIdsOf(partner.iHaveTheyWant),
  };
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
