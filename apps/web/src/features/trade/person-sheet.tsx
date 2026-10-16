import { EyeSlashIcon } from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import { CARD_LIMIT } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { Link, useHydrated } from "@tanstack/react-router";
import { useState } from "react";

import { MenuItem } from "@/components/ui/menu";
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getListLinkOption } from "@/features/list/list-link";
import { SafetyMenu } from "@/features/moderation/safety-menu";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { displayNickname } from "@/lib/address";
import { relativeTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useHideWithUndo } from "./actions";
import { ListRoleBadge } from "./list-role-badge";
import { LoadError } from "./load-error";
import { MATCH_TONE, MatchChip } from "./match-chip";
import { MatchedLists } from "./matched-lists";
import { personOptions } from "./queries";
import { TILE } from "./thumb-grid";
import { TradeActions, type TradeContact } from "./trade-actions";
import { TradeHeader } from "./trade-header";

type Person = NonNullable<Outputs["trade"]["person"]["partner"]>;
type Collections = Readonly<Record<string, ValidObjekt | undefined>>;

const DIRECTIONS = [
  { key: "theyHaveIWant", section: m.trade_section_they_have, tone: MATCH_TONE.theyHave },
  { key: "iHaveTheyWant", section: m.trade_section_you_have, tone: MATCH_TONE.youHave },
] as const;

/** `md`, where the sheet moves from the bottom to the inline end */
const WIDE = "(min-width: 48rem)";

/**
 * Everything one person matches with the viewer's lists. Its presence in the URL is the
 * `person` parameter: the caller renders it while that is set.
 */
export function PersonSheet({
  userId,
  list,
  onClose,
}: {
  userId: string;
  list: string | undefined;
  onClose: () => void;
}) {
  const wide = useMediaQuery(WIDE);
  const query = useQuery(personOptions(userId, list));
  const partner = query.data?.partner ?? null;
  const header = query.data?.header ?? null;
  const [active, setActive] = useState<ValidObjekt | null>(null);

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetPopup side={wide ? "right" : "bottom"} className="max-md:max-h-[90dvh] md:max-w-xl">
        <SheetHeader>
          <SheetTitle className="font-display text-base">
            {(partner ?? header)?.identity.name ?? m.trade_person_title()}
          </SheetTitle>
          <SheetDescription className="sr-only">{m.trade_person_description()}</SheetDescription>
        </SheetHeader>
        {query.isPending ? (
          <PersonSkeleton />
        ) : query.isError ? (
          <SheetPanel>
            <LoadError onRetry={() => void query.refetch()} />
          </SheetPanel>
        ) : partner ? (
          <PersonBody
            partner={partner}
            collections={query.data.collections}
            checkedAt={query.data.checkedAt}
            onOpen={setActive}
            onHidden={onClose}
          />
        ) : (
          <SheetPanel className="flex flex-col gap-4">
            {header ? <TradeHeader person={header} socials="all" /> : null}
            <p className="text-muted-foreground text-sm text-pretty">
              {m.trade_person_no_matches()}
            </p>
          </SheetPanel>
        )}
        <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
      </SheetPopup>
    </Sheet>
  );
}

function PersonBody({
  partner,
  collections,
  checkedAt,
  onOpen,
  onHidden,
}: {
  partner: Person;
  collections: Collections;
  checkedAt: string;
  onOpen: (objekt: ValidObjekt) => void;
  onHidden: () => void;
}) {
  const { identity } = partner;
  const hide = useHideWithUndo();
  // the times are relative to the viewer's clock, so they wait for hydration
  const hydrated = useHydrated();
  const clock = useMinuteClock();
  const now = hydrated ? clock : undefined;
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
    <>
      <SheetPanel className="flex flex-col gap-5">
        <TradeHeader
          person={partner}
          socials="all"
          end={
            <SafetyMenu
              userId={partner.userId}
              name={identity.name}
              report
              extraItems={
                <MenuItem onClick={() => hide(partner.userId, identity.name, onHidden)}>
                  <EyeSlashIcon />
                  {m.trade_hide_partner()}
                </MenuItem>
              }
            />
          }
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

        <div>
          <MatchChip counts={match.counts} popover={<MatchedLists {...match} />} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {DIRECTIONS.map((direction) => (
            <Column
              key={direction.key}
              label={direction.section({ count: partner[direction.key].length })}
              tone={direction.tone}
              counted={partner[direction.key].map((item) => item.slug)}
              dropped={partner.dropped.filter((item) => item.direction === direction.key)}
              collections={collections}
              onOpen={onOpen}
            />
          ))}
        </div>
        {partner.dropped.length > 0 ? (
          <p className="text-muted-foreground text-xs text-pretty">
            {m.trade_person_dropped_note()}
          </p>
        ) : null}

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{m.trade_partner_lists_title()}</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {partner.lists.map((item) => (
              <li key={item.id} className="flex min-w-0 items-center gap-2">
                <ListRoleBadge type={item.listTypeNew} />
                <Link
                  {...getListLinkOption({
                    slug: item.slug,
                    profileSlug: item.profileSlug,
                    profileAddress: item.profileAddress,
                    profile: item.profileAddress
                      ? { address: item.profileAddress, nickname: item.profileNickname }
                      : null,
                  })}
                  className="min-w-0 break-words underline-offset-2 hover:underline"
                >
                  {item.name}
                </Link>
                <span className="text-muted-foreground ms-auto font-mono text-xs tabular-nums">
                  {m.trade_person_list_matches({ count: item.matches })}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <time dateTime={checkedAt} className="text-muted-foreground block font-mono text-xs">
          {now !== undefined
            ? m.trade_checked_at({
                time: relativeTime(Math.min(Date.parse(checkedAt), now), now),
              })
            : null}
        </time>
      </SheetPanel>
      <SheetFooter className="flex-row flex-wrap items-center justify-end gap-2">
        <TradeActions contact={contact} name={identity.name} />
      </SheetFooter>
    </>
  );
}

/** One direction: the counted objekts, then the ones the ownership rule left out. */
function Column({
  label,
  tone,
  counted,
  dropped,
  collections,
  onOpen,
}: {
  label: string;
  tone: string;
  counted: readonly string[];
  dropped: Person["dropped"];
  collections: Collections;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const shown = counted.slice(0, CARD_LIMIT);
  const rest = counted.length - shown.length;
  const out = dropped.slice(0, CARD_LIMIT);

  return (
    <section className="flex min-w-0 flex-col gap-1.5">
      <h3 className={cn("font-mono text-xs uppercase tabular-nums", tone)}>{label}</h3>
      {counted.length === 0 && out.length === 0 ? (
        <p className="text-muted-foreground text-sm">{m.trade_strip_none()}</p>
      ) : (
        <ul className="flex flex-wrap items-start gap-x-1.5 gap-y-2">
          {shown.map((slug) => (
            <li key={slug} className="@container w-12 shrink-0">
              <Thumb slug={slug} collections={collections} onOpen={onOpen} />
            </li>
          ))}
          {rest > 0 ? (
            <li className="@container w-12 shrink-0">
              <div className={cn(TILE, "text-xs tabular-nums")}>
                <span aria-hidden>+{rest}</span>
                <span className="sr-only">{m.trade_more_count({ count: rest })}</span>
              </div>
            </li>
          ) : null}
          {out.map((item) => (
            <li key={`out-${item.slug}`} className="@container w-12 shrink-0">
              <div className="opacity-60 grayscale">
                <div className="decoration-destructive line-through decoration-2">
                  <Thumb slug={item.slug} collections={collections} onOpen={onOpen} />
                </div>
                <span className="text-destructive text-xxs block text-center font-mono leading-tight text-balance">
                  {item.reason === "not_owned"
                    ? m.trade_person_not_owned()
                    : m.trade_person_not_transferable()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Thumb({
  slug,
  collections,
  onOpen,
}: {
  slug: string;
  collections: Collections;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const collection = collections[slug];
  if (!collection) {
    return <div className={cn(TILE, "text-xxs p-0.5 text-center break-all")}>{slug}</div>;
  }
  return (
    <ObjektCard objekt={collection} image="thumbnail" hideLabel onOpen={() => onOpen(collection)} />
  );
}

function PersonSkeleton() {
  return (
    <SheetPanel className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2 pt-0.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-6 w-48 rounded-md" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    </SheetPanel>
  );
}

/** The shape Browse's `person` has, so the sheet opens the same Matched with your lists popover. */
function matchedLists(partner: Person) {
  const listIdsOf = (matches: Person["theyHaveIWant"]) => [
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
 * card: the server takes only a list that shows its owner, which a matching list may not.
 */
function bestCard(partner: Person) {
  const list = partner.lists[0];
  if (!list) return undefined;
  const match = [...partner.theyHaveIWant, ...partner.iHaveTheyWant].find((item) =>
    item.partnerListIds.includes(list.id),
  );
  return match ? { collectionSlug: match.slug } : undefined;
}
