import { CaretDownIcon, EyeSlashIcon } from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import type { Dropped } from "@repo/api/lib/trade-rank";
import { PREVIEW_LIMIT } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { Link } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverPopup, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { getListLinkOption } from "@/features/list/list-link";
import { displayNickname } from "@/lib/address";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { ListRoleBadge } from "./list-role-badge";
import { MATCH_TONE, MatchChip } from "./match-chip";
import { MatchColumn, MatchObjekt } from "./match-grid";
import { MatchedLists } from "./matched-lists";
import { TradeActions, type TradeContact } from "./trade-actions";
import { TradeHeader } from "./trade-header";

export type TradePartner = Outputs["trade"]["forYou"]["partners"][number];
export type TradeCollections = Record<string, ValidObjekt | undefined>;

/** theirs first, as the chip reads */
const DIRECTIONS = [
  { key: "theyHaveIWant", section: m.trade_section_they_have, tone: MATCH_TONE.theyHave },
  { key: "iHaveTheyWant", section: m.trade_section_you_have, tone: MATCH_TONE.youHave },
] as const;

const REASON: Record<Dropped["reason"], () => string> = {
  not_owned: m.trade_reason_not_owned,
  not_transferable: m.trade_reason_not_transferable,
};

const DROPPED_LIMIT = 4;

export function PartnerRow({
  id,
  partner,
  now,
  collections,
  open,
  onOpenChange,
  onOpen,
  onHide,
}: {
  id: string;
  partner: TradePartner;
  now: number;
  collections: TradeCollections;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const dropped = DIRECTIONS.map((direction) =>
    partner.dropped.filter((item) => item.direction === direction.key).slice(0, DROPPED_LIMIT),
  );
  const shownDropped = dropped.some((items) => items.length > 0);

  return (
    <article
      id={id}
      // `data-highlight` is set for a moment when a Browse link lands here
      className="data-highlight:ring-ring bg-card scroll-mt-20 rounded-lg border p-4 transition-shadow duration-700 data-highlight:ring-2 motion-reduce:transition-none"
    >
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div className="flex items-start gap-1">
          <TradeHeader
            className="min-w-0 flex-1"
            person={partner}
            note={
              <>
                <time
                  dateTime={partner.updatedAt}
                  suppressHydrationWarning
                  className="text-muted-foreground block font-mono text-xs"
                >
                  {m.trade_partner_updated({
                    time: relativeTime(Math.min(Date.parse(partner.updatedAt), now), now),
                  })}
                </time>
                {also.length > 0 ? (
                  <span className="text-muted-foreground block text-xs break-words">
                    {m.trade_also({ names: also.join(", ") })}
                  </span>
                ) : null}
              </>
            }
            end={
              <>
                <MatchChip
                  theyHave={match.youWant}
                  youHave={match.youHave}
                  popover={<MatchedLists match={match} />}
                />
                <Popover>
                  <PopoverTrigger
                    render={<Button variant="ghost" size="xs" className="font-mono" />}
                  >
                    {m.trade_lists_count({ count: partner.lists.length })}
                  </PopoverTrigger>
                  <PopoverPopup align="start" className="w-72">
                    <div className="flex flex-col gap-3">
                      <PopoverTitle className="text-sm">
                        {m.trade_partner_lists_title()}
                      </PopoverTitle>
                      <ul className="flex flex-col gap-1.5 text-sm">
                        {partner.lists.map((list) => (
                          <li key={list.id} className="flex min-w-0 items-center gap-2">
                            <ListRoleBadge type={list.listTypeNew} />
                            <Link
                              {...getListLinkOption({
                                slug: list.slug,
                                profileSlug: list.profileSlug,
                                profileAddress: list.profileAddress,
                                profile: list.profileAddress
                                  ? { address: list.profileAddress, nickname: list.profileNickname }
                                  : null,
                              })}
                              className="min-w-0 break-words underline-offset-2 hover:underline"
                            >
                              {list.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </PopoverPopup>
                </Popover>
                {partner.idle ? (
                  <Badge variant="outline" size="sm">
                    {m.trade_idle()}
                  </Badge>
                ) : null}
              </>
            }
          />
          <CollapsibleTrigger
            className="group shrink-0"
            render={
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={m.trade_row_toggle({ name: identity.name })}
              />
            }
          >
            <CaretDownIcon
              aria-hidden
              className="transition-transform group-data-panel-open:rotate-180"
            />
          </CollapsibleTrigger>
        </div>

        <CollapsiblePanel className="-mx-1 -mb-1 px-1 pb-1">
          <div className="flex flex-col gap-4 pt-4 sm:ps-12">
            <div className="grid gap-4 sm:grid-cols-2">
              {DIRECTIONS.map((direction, index) =>
                partner[direction.key].length > 0 || (dropped[index]?.length ?? 0) > 0 ? (
                  <section key={direction.key} className="flex min-w-0 flex-col gap-2">
                    <h3 className={cn("font-mono text-xs uppercase tabular-nums", direction.tone)}>
                      {direction.section({ count: partner[direction.key].length })}
                    </h3>
                    <MatchColumn
                      count={partner[direction.key].length}
                      dropped={dropped[index]?.map((item) => (
                        <MatchObjekt
                          key={item.slug}
                          slug={item.slug}
                          collection={collections[item.slug]}
                          reason={REASON[item.reason]()}
                          onOpen={onOpen}
                        />
                      ))}
                    >
                      {partner[direction.key].slice(0, PREVIEW_LIMIT).map((item) => (
                        <MatchObjekt
                          key={item.slug}
                          slug={item.slug}
                          collection={collections[item.slug]}
                          onOpen={onOpen}
                        />
                      ))}
                    </MatchColumn>
                  </section>
                ) : null,
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <div className="text-muted-foreground flex min-w-0 flex-1 flex-col gap-1 text-xs text-pretty">
                {partner.idle ? <p>{m.trade_idle_hint()}</p> : null}
                {shownDropped ? <p>{m.trade_not_counted_hint()}</p> : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onHide(partner)}>
                  <EyeSlashIcon />
                  {m.trade_hide_partner()}
                </Button>
                <TradeActions contact={contact} name={identity.name} />
              </div>
            </div>
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </article>
  );
}

/** A row's shape (byline and chip, two columns of thumbnails, footer), so the list lands in place. */
export function PartnerRowSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2 pt-0.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
        <Skeleton className="h-6 w-28 rounded-md max-sm:hidden" />
        <Skeleton className="size-8 shrink-0 rounded-md" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 sm:ps-12">
        {Array.from({ length: 2 }).map((_, column) => (
          <div key={column} className="flex flex-col gap-2">
            <Skeleton className="h-3 w-36" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="aspect-photocard rounded-photocard w-12 shrink-0"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </div>
  );
}

/** Browse's match shape, so both tabs open the same Matched with your lists popover. */
function matchedLists(partner: TradePartner) {
  const listIdsOf = (matches: TradePartner["theyHaveIWant"]) => [
    ...new Set(matches.flatMap((match) => match.myListIds)),
  ];
  return {
    youWant: partner.theyHaveIWant.length,
    youHave: partner.iHaveTheyWant.length,
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
