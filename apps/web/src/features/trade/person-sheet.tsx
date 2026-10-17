import { EyeSlashIcon } from "@phosphor-icons/react";
import type { Outputs } from "@repo/api";
import { CARD_LIMIT, type MatchCounts, mutualOf } from "@repo/api/schemas/trade";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useQuery } from "@tanstack/react-query";
import { Link, useHydrated } from "@tanstack/react-router";
import { type RefObject, useRef, useState } from "react";

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
import { LIST_TYPE_LABEL, LIST_TYPE_TONE } from "@/features/list/list-type-badge";
import { SafetyMenu } from "@/features/moderation/safety-menu";
import { ObjektDrawer } from "@/features/objekt/drawer";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useMinuteClock } from "@/hooks/use-minute-clock";
import { displayNickname } from "@/lib/address";
import { relativeTime } from "@/lib/time";
import { TONE_INK, toneChip } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useHideWithUndo } from "./actions";
import { LoadError } from "./load-error";
import { MATCH_TONE } from "./match-chip";
import { type ListGroup, groupByList } from "./person-groups";
import { personOptions } from "./queries";
import { TILE } from "./thumb-grid";
import { TradeActions, type TradeContact } from "./trade-actions";
import { TradeHeader } from "./trade-header";

type Person = NonNullable<Outputs["trade"]["person"]["partner"]>;
type Collections = Readonly<Record<string, ValidObjekt | undefined>>;

const DIRECTIONS = [
  { key: "theyHaveIWant", label: m.trade_strip_you_want, none: m.trade_strip_none_you_want },
  { key: "iHaveTheyWant", label: m.trade_strip_you_have, none: m.trade_strip_none_you_have },
] as const;

/** Thumbnails a phone shows before "+N": two rows of five, the last place being the tile. */
const PHONE_PLACES = 10;

const GRID = "grid grid-cols-5 gap-x-1.5 gap-y-2 md:grid-cols-[repeat(auto-fill,minmax(3rem,1fr))]";

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
        <SheetTitle className="sr-only">
          {(partner ?? header)?.identity.name ?? m.trade_person_title()}
        </SheetTitle>
        <SheetDescription className="sr-only">{m.trade_person_description()}</SheetDescription>
        {query.isPending ? (
          <PersonSkeleton />
        ) : query.isError ? (
          <>
            <SheetHeader className="pe-12">
              <p className="font-display text-base font-semibold">{m.trade_person_title()}</p>
            </SheetHeader>
            <SheetPanel>
              <LoadError onRetry={() => void query.refetch()} />
            </SheetPanel>
          </>
        ) : partner ? (
          <PersonBody
            partner={partner}
            collections={query.data.collections}
            wide={wide}
            onOpen={setActive}
            onHidden={onClose}
          />
        ) : (
          <>
            <SheetHeader className="pe-12">
              {header ? <TradeHeader person={header} socials="all" wrapTrust /> : null}
            </SheetHeader>
            <SheetPanel>
              <p className="text-muted-foreground text-sm text-pretty">
                {m.trade_person_no_matches()}
              </p>
            </SheetPanel>
          </>
        )}
        <ObjektDrawer objekt={active} onClose={() => setActive(null)} />
      </SheetPopup>
    </Sheet>
  );
}

function PersonBody({
  partner,
  collections,
  wide,
  onOpen,
  onHidden,
}: {
  partner: Person;
  collections: Collections;
  wide: boolean;
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
  // hooks stay top-level: inside an object literal the React Compiler can cache them away
  const theyHaveRef = useRef<HTMLElement>(null);
  const youHaveRef = useRef<HTMLElement>(null);
  const sections = { theyHaveIWant: theyHaveRef, iHaveTheyWant: youHaveRef };
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
      <SheetHeader className="pe-12">
        <TradeHeader
          person={partner}
          socials="all"
          wrapTrust
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
              <span className="text-muted-foreground block min-h-4 font-mono text-xs">
                {now !== undefined ? (
                  <time dateTime={partner.updatedAt}>
                    {m.trade_partner_updated({
                      time: relativeTime(Math.min(Date.parse(partner.updatedAt), now), now),
                    })}
                  </time>
                ) : null}
              </span>
              {also.length > 0 ? (
                <span className="text-muted-foreground block text-xs break-words">
                  {m.trade_also({ names: also.join(", ") })}
                </span>
              ) : null}
            </>
          }
        />
      </SheetHeader>
      <SheetPanel className="flex flex-col gap-5">
        <PersonSummary
          counts={partner.counts}
          onJump={(key) => {
            const section = sections[key].current;
            section?.focus({ preventScroll: true });
            section?.scrollIntoView({ block: "start" });
          }}
        />

        {DIRECTIONS.map((direction) => (
          <Section
            key={direction.key}
            label={direction.label}
            none={direction.none()}
            sectionRef={sections[direction.key]}
            groups={groupByList(partner[direction.key], partner.lists)}
            dropped={partner.dropped.filter((item) => item.direction === direction.key)}
            collections={collections}
            wide={wide}
            onOpen={onOpen}
          />
        ))}
        {partner.dropped.length > 0 ? (
          <p className="text-muted-foreground text-xs text-pretty">
            {m.trade_person_dropped_note()}
          </p>
        ) : null}
      </SheetPanel>
      <SheetFooter
        className={cn(
          "items-center gap-2 md:flex-row md:flex-wrap md:justify-end",
          partner.messageable ? "grid grid-cols-2 md:flex" : "flex",
        )}
      >
        <TradeActions contact={contact} name={identity.name} />
      </SheetFooter>
    </>
  );
}

/** The counts the post's chip reads, as three cells; A and B jump to their section. */
function PersonSummary({
  counts,
  onJump,
}: {
  counts: MatchCounts;
  onJump: (key: (typeof DIRECTIONS)[number]["key"]) => void;
}) {
  const mutual = mutualOf(counts);
  const cell = "flex min-w-0 flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-start";
  const quiet = "bg-secondary border-transparent";
  const number = "font-mono text-lg leading-none tabular-nums";
  const label = "text-muted-foreground text-xs";
  return (
    <div className="grid grid-cols-3 gap-2">
      <div
        className={cn(cell, mutual > 0 ? toneChip("progress") : cn(quiet, "text-muted-foreground"))}
      >
        <span className="sr-only">{m.trade_summary_mutual_aria({ count: mutual })}</span>
        <span aria-hidden className={number}>
          {mutual}
        </span>
        <span aria-hidden className={mutual > 0 ? undefined : label}>
          {m.trade_summary_mutual()}
        </span>
      </div>
      <button
        type="button"
        className={cn(
          cell,
          quiet,
          "focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2",
        )}
        onClick={() => onJump("theyHaveIWant")}
      >
        <span className="sr-only">{m.trade_match_they_have({ count: counts.theyHave })}</span>
        <span aria-hidden className={cn(number, MATCH_TONE.theyHave)}>
          {counts.theyHave}
        </span>
        <span aria-hidden className={label}>
          {m.trade_summary_you_want()}
        </span>
      </button>
      <button
        type="button"
        className={cn(
          cell,
          quiet,
          "focus-visible:ring-ring cursor-pointer outline-none focus-visible:ring-2",
        )}
        onClick={() => onJump("iHaveTheyWant")}
      >
        <span className="sr-only">{m.trade_match_you_have({ count: counts.youHave })}</span>
        <span aria-hidden className={cn(number, MATCH_TONE.youHave)}>
          {counts.youHave}
        </span>
        <span aria-hidden className={label}>
          {m.trade_summary_they_want()}
        </span>
      </button>
    </div>
  );
}

type PersonList = Person["lists"][number];

/**
 * One direction: the counted objekts grouped by the person's list, each group labelled as a
 * post's strip is ("HAVE 3 you want"), then the ones the ownership rule left out. Below `md` a
 * section past two rows folds to nine thumbnails and a "+N" button.
 */
function Section({
  label,
  none,
  sectionRef,
  groups,
  dropped,
  collections,
  wide,
  onOpen,
}: {
  label: (values: { role: string; count: number }) => string;
  none: string;
  sectionRef: RefObject<HTMLElement | null>;
  groups: ListGroup<PersonList>[];
  dropped: Person["dropped"];
  collections: Collections;
  wide: boolean;
  onOpen: (objekt: ValidObjekt) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = groups.reduce((sum, group) => sum + group.slugs.length, 0);
  const folded = !wide && !expanded && total > PHONE_PLACES;
  const cap = folded ? PHONE_PLACES - 1 : CARD_LIMIT;
  const visible: (ListGroup<PersonList> & { count: number })[] = [];
  let shown = 0;
  for (const group of groups) {
    const slugs = group.slugs.slice(0, cap - shown);
    if (slugs.length === 0) break;
    visible.push({ list: group.list, slugs, count: group.slugs.length });
    shown += slugs.length;
  }
  const rest = total - shown;
  const out = dropped.slice(0, CARD_LIMIT);

  return (
    <section
      ref={sectionRef}
      tabIndex={-1}
      className="flex min-w-0 scroll-mt-2 flex-col gap-4 outline-none"
    >
      {total === 0 && out.length === 0 ? (
        <p className="text-muted-foreground font-mono text-xs">{none}</p>
      ) : null}
      {visible.map((group, index) => (
        <div key={group.list?.id ?? "other"} className="flex flex-col gap-1.5">
          {group.list ? <GroupHeading list={group.list} label={label} count={group.count} /> : null}
          <ul className={GRID}>
            {group.slugs.map((slug) => (
              <li key={slug} className="@container min-w-0">
                <Thumb slug={slug} collections={collections} onOpen={onOpen} />
              </li>
            ))}
            {rest > 0 && index === visible.length - 1 ? (
              <li className="@container min-w-0">
                {folded ? (
                  <button
                    type="button"
                    className={cn(
                      TILE,
                      "focus-visible:ring-ring w-full cursor-pointer text-xs tabular-nums outline-none focus-visible:ring-2",
                    )}
                    onClick={() => setExpanded(true)}
                  >
                    <span aria-hidden>+{rest}</span>
                    <span className="sr-only">{m.trade_more_count({ count: rest })}</span>
                  </button>
                ) : (
                  <div className={cn(TILE, "text-xs tabular-nums")}>
                    <span aria-hidden>+{rest}</span>
                    <span className="sr-only">{m.trade_more_count({ count: rest })}</span>
                  </div>
                )}
              </li>
            ) : null}
          </ul>
        </div>
      ))}
      {out.length > 0 ? (
        <ul className={GRID}>
          {out.map((item) => (
            <li key={`out-${item.slug}`} className="@container min-w-0">
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
      ) : null}
    </section>
  );
}

/** A group's strip label in its list type's colour, then the list's name linking to it. */
function GroupHeading({
  list,
  label,
  count,
}: {
  list: PersonList;
  label: (values: { role: string; count: number }) => string;
  count: number;
}) {
  return (
    <h3 className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span
        className={cn(
          "font-mono text-xs uppercase tabular-nums",
          TONE_INK[LIST_TYPE_TONE[list.listTypeNew]],
        )}
      >
        {label({ role: LIST_TYPE_LABEL[list.listTypeNew](), count })}
      </span>
      <Link
        {...getListLinkOption({
          slug: list.slug,
          profileSlug: list.profileSlug,
          profileAddress: list.profileAddress,
          profile: list.profileAddress
            ? { address: list.profileAddress, nickname: list.profileNickname }
            : null,
        })}
        className="min-w-0 text-sm break-words underline-offset-2 hover:underline"
      >
        {list.name}
      </Link>
    </h3>
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
    <>
      <ObjektCard
        objekt={collection}
        image="thumbnail"
        hideLabel
        onOpen={() => onOpen(collection)}
      />
      <span className="text-muted-foreground text-xxs mt-0.5 block text-center font-mono leading-tight">
        <span className="block truncate">{collection.member}</span>
        <span className="block truncate">{collection.collectionNo}</span>
      </span>
    </>
  );
}

function PersonSkeleton() {
  return (
    <>
      <SheetHeader className="pe-12">
        <div className="flex items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </SheetHeader>
      <SheetPanel className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
        </div>
        <Skeleton className="h-32 rounded-lg" />
      </SheetPanel>
    </>
  );
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
