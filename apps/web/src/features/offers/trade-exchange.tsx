import {
  ArrowsLeftRightIcon,
  CheckIcon,
  ClockIcon,
  GridFourIcon,
  type Icon,
  ListIcon,
  MagnifyingGlassIcon,
  MinusIcon,
  PaperPlaneTiltIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";
import type { TradeView } from "@repo/api/schemas/offer";
import { type MouseEvent, type Ref, useId } from "react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { untilLabel } from "@/features/chat/format";
import { TONE_INK, TONE_SOLID, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { EstimatedSerialNote } from "./estimated-serial-note";
import {
  type ExchangeFilter,
  type ExchangeGroup,
  type GroupKey,
  exchangeGroups,
  filterCounts,
  legStatus,
} from "./exchange";
import { itemLabel } from "./format";
import { MonoMessage, Progress, TopupText } from "./mono";
import { type Leg, type LegChip, type SideStatus, sideStatus } from "./next-step";
import { ObjektTile, type TileMark } from "./objekt-tile";
import { OfferThumb } from "./offer-item";
import type { Collections } from "./pick";
import { Serial } from "./wrong-copy";

type Side = "give" | "get";

const SIDE_STATUS: Record<SideStatus, { text: () => string; ink: string }> = {
  sentVerified: { text: m.offer_side_sent_verified, ink: "text-success-foreground" },
  verified: { text: m.offer_leg_verified, ink: "text-success-foreground" },
  waitingOnThem: { text: m.offer_side_waiting_them, ink: "text-warning-foreground" },
  differentCopy: { text: m.offer_side_different, ink: "text-warning-foreground" },
  youOwe: { text: m.offer_side_you_owe, ink: "text-progress" },
  afterYouSend: { text: m.offer_side_after_you, ink: "text-muted-foreground" },
  notSent: { text: m.offer_side_not_sent, ink: "text-muted-foreground" },
};

const LEG_MARKS: Record<LegChip, { tone: Tone; icon: Icon; label: () => string }> = {
  verified: { tone: "success", icon: CheckIcon, label: m.offer_leg_verified },
  waiting: { tone: "warning", icon: ClockIcon, label: m.offer_leg_waiting_short },
  sendThis: { tone: "progress", icon: PaperPlaneTiltIcon, label: m.offer_leg_send_this },
  differentCopy: { tone: "warning", icon: WarningIcon, label: m.offer_side_different },
  notSent: { tone: "neutral", icon: MinusIcon, label: m.offer_side_not_sent },
};

const GROUPS: Record<GroupKey, { title: () => string; tone: Tone }> = {
  send: { title: m.offer_group_send, tone: "progress" },
  decide: { title: m.offer_group_decide, tone: "warning" },
  stuck: { title: m.offer_group_stuck, tone: "warning" },
  waiting: { title: m.offer_side_waiting_them, tone: "warning" },
  verified: { title: m.offer_leg_verified, tone: "success" },
  notSent: { title: m.offer_side_not_sent, tone: "neutral" },
};

const FILTER_LABEL: Record<ExchangeFilter, () => string> = {
  all: m.offer_filter_all,
  needsYou: m.offer_filter_needs_you,
  waiting: m.offer_leg_waiting_short,
  verified: m.offer_leg_verified,
};

/**
 * A stuck or away leg's warning, while it waits. The away date is in the viewer's zone, unknown
 * to the server render, so it waits for the client.
 */
function legWarning(leg: Leg, ended: boolean, hydrated: boolean) {
  const { warning } = legStatus(leg, ended);
  if (warning === "stuck") return m.offer_leg_stuck();
  if (warning === "away" && leg.away && hydrated) {
    return m.offer_leg_away({ date: untilLabel(leg.away.breaksAt) });
  }
  return null;
}

/** What a tile and a list row say about a leg: its mark and its accessible name. */
export function legView(leg: Leg, ended: boolean, collections: Collections, hydrated = true) {
  const status = legStatus(leg, ended);
  const chip = LEG_MARKS[status.chip];
  const mark: TileMark = { tone: chip.tone, icon: chip.icon, label: chip.label() };
  const warning = legWarning(leg, ended, hydrated);
  const label = [itemLabel(leg, collections), mark.label, warning].filter(Boolean).join(" · ");
  return { status, mark, warning, label };
}

function LegSerial({ leg }: { leg: Leg }) {
  return leg.objektId === null ? (
    m.offer_leg_any_copy()
  ) : (
    <Serial serial={leg.serial} estimated={leg.serialEstimated} />
  );
}

export type ExchangeState = {
  filter: ExchangeFilter;
  setFilter: (filter: ExchangeFilter) => void;
  find: string;
  setFind: (find: string) => void;
  view: "grid" | "list";
  setView: (view: "grid" | "list") => void;
  side: Side;
  setSide: (side: Side) => void;
  selectedId: number | null;
  onSelect: (leg: Leg, event: MouseEvent<HTMLButtonElement>) => void;
};

function FilterChips({
  legs,
  ended,
  state,
  className,
}: {
  legs: Leg[];
  ended: boolean;
  state: ExchangeState;
  className?: string;
}) {
  const counts = filterCounts(legs, ended);
  return (
    <div
      role="group"
      aria-label={m.offer_filter_label()}
      data-scroll-x
      className={cn("flex min-w-0 gap-1.5 overflow-x-auto", className)}
    >
      {(Object.keys(FILTER_LABEL) as ExchangeFilter[]).map((filter) => (
        <Button
          key={filter}
          variant={state.filter === filter ? "default" : "outline"}
          size="sm"
          aria-pressed={state.filter === filter}
          className="shrink-0 rounded-full"
          onClick={() => state.setFilter(filter)}
        >
          {FILTER_LABEL[filter]()}
          <span className="font-mono text-xs tabular-nums opacity-70">{counts[filter]}</span>
        </Button>
      ))}
    </div>
  );
}

function Toolbar({ state }: { state: ExchangeState }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <InputGroup className="min-w-0 flex-1 basis-48">
        <InputGroupInput
          size="sm"
          type="search"
          aria-label={m.offer_exchange_find()}
          placeholder={m.offer_exchange_find()}
          value={state.find}
          onChange={(event) => state.setFind(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Escape" || state.find === "") return;
            event.preventDefault();
            state.setFind("");
          }}
        />
        <InputGroupAddon>
          <MagnifyingGlassIcon />
        </InputGroupAddon>
        {state.find !== "" ? (
          <InputGroupAddon align="inline-end">
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={m.chat_search_clear()}
              onClick={() => state.setFind("")}
            >
              <XIcon />
            </Button>
          </InputGroupAddon>
        ) : null}
      </InputGroup>
      <ToggleGroup
        variant="outline"
        size="sm"
        aria-label={m.offer_exchange_view()}
        value={[state.view]}
        onValueChange={([next]) => {
          if (next === "grid" || next === "list") state.setView(next);
        }}
      >
        <ToggleGroupItem value="grid" aria-label={m.offer_view_grid()}>
          <GridFourIcon />
        </ToggleGroupItem>
        <ToggleGroupItem value="list" aria-label={m.offer_view_list()}>
          <ListIcon />
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

function GroupHeading({ group, id }: { group: ExchangeGroup; id: string }) {
  const meta = GROUPS[group.key];
  const title = group.profile
    ? m.offer_group_from({ name: group.profile.name })
    : group.anyCopy
      ? m.offer_group_any_copy()
      : meta.title();
  return (
    <h4 id={id} className={cn("flex items-center gap-2 text-xs font-medium", TONE_INK[meta.tone])}>
      <span aria-hidden className={cn("size-2 rounded-full", TONE_SOLID[meta.tone])} />
      {title}
      <span className="text-muted-foreground font-mono tabular-nums">{group.legs.length}</span>
    </h4>
  );
}

function Group({
  group,
  ended,
  collections,
  state,
  hydrated,
}: {
  group: ExchangeGroup;
  ended: boolean;
  collections: Collections;
  state: ExchangeState;
  hydrated: boolean;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <GroupHeading group={group} id={headingId} />
      {state.view === "grid" ? (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(--spacing(18),1fr))] gap-1">
          {group.legs.map((leg) => {
            const view = legView(leg, ended, collections, hydrated);
            return (
              <li key={leg.id} className="min-w-0">
                <ObjektTile
                  slug={leg.collectionSlug}
                  collection={collections[leg.collectionSlug]}
                  serial={<LegSerial leg={leg} />}
                  label={view.label}
                  mark={view.mark}
                  warning={view.warning !== null}
                  dim={view.status.chip === "verified"}
                  pressed={state.selectedId === leg.id}
                  onPress={(event) => state.onSelect(leg, event)}
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="flex flex-col">
          {group.legs.map((leg) => {
            const view = legView(leg, ended, collections, hydrated);
            const collection = collections[leg.collectionSlug];
            return (
              <li key={leg.id}>
                <button
                  type="button"
                  aria-pressed={state.selectedId === leg.id}
                  aria-label={view.label}
                  onClick={(event) => state.onSelect(leg, event)}
                  className={cn(
                    "hover:bg-accent/60 focus-visible:ring-ring flex w-full min-w-0 items-center gap-3 rounded-md px-1.5 py-1 text-start text-sm outline-none focus-visible:ring-2",
                    state.selectedId === leg.id && "bg-accent",
                  )}
                >
                  <OfferThumb
                    slug={leg.collectionSlug}
                    collection={collection}
                    className={cn("w-8", view.status.chip === "verified" && "opacity-55")}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {itemLabel({ ...leg, serial: null }, collections)}
                  </span>
                  <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                    <LegSerial leg={leg} />
                  </span>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 text-xs max-sm:sr-only",
                      TONE_INK[view.mark.tone],
                    )}
                  >
                    {view.warning ? (
                      <WarningIcon aria-hidden weight="fill" className="text-warning-foreground" />
                    ) : null}
                    {view.mark.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * The exchange: filter chips, find and view above You give and You get, each side's objekts as
 * small cards grouped by what needs the viewer first. On a phone the sides are two tabs.
 */
export function TradeExchange({
  trade,
  collections,
  state,
  hydrated,
  ref,
}: {
  trade: TradeView;
  collections: Collections;
  state: ExchangeState;
  hydrated: boolean;
  ref?: Ref<HTMLElement>;
}) {
  const titleId = useId();
  const ended = trade.status !== "in_progress";
  const topupIn = trade.topup ? (trade.topup.payer === "you" ? "give" : "get") : null;
  // past tense once that side moved something; a top-up only moves with a completed trade
  const moved = (key: Side, legs: Leg[]) =>
    ended &&
    (legs.some((leg) => leg.state === "verified") ||
      (topupIn === key && trade.status === "completed"));
  const giveLegs = trade.legs.filter((leg) => leg.fromYou);
  const getLegs = trade.legs.filter((leg) => !leg.fromYou);
  const sides = [
    {
      key: "give" as const,
      title: moved("give", giveLegs) ? m.offer_trade_you_gave() : m.offer_side_give(),
      legs: giveLegs,
    },
    {
      key: "get" as const,
      title: moved("get", getLegs) ? m.offer_trade_you_got() : m.offer_side_get(),
      legs: getLegs,
    },
  ];
  const toDecide = getLegs.filter(
    (leg) => leg.state === "waiting" && leg.substitutes.some((copy) => copy.status === "pending"),
  ).length;
  const narrowed = state.filter !== "all" || state.find.trim() !== "";
  const showAll = () => {
    state.setFilter("all");
    state.setFind("");
  };
  const activeLegs = state.side === "give" ? giveLegs : getLegs;

  return (
    <section ref={ref} aria-labelledby={titleId} className="bg-card scroll-mt-4 rounded-xl border">
      <header className="flex flex-col gap-3 border-b px-4 py-3.5 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id={titleId} className="text-sm font-semibold">
            {m.offer_exchange_title()}
          </h2>
          <span className="text-muted-foreground text-xs">
            {ended && trade.progress.verified === 0 ? (
              m.offer_exchange_nothing_sent()
            ) : (
              <>
                <Progress {...trade.progress} />
                {toDecide > 0 && !ended ? (
                  <>
                    {" · "}
                    <MonoMessage
                      values={[toDecide]}
                      text={([count]) => m.offer_exchange_to_decide({ count: count! })}
                    />
                  </>
                ) : null}
              </>
            )}
          </span>
        </div>
        <FilterChips legs={trade.legs} ended={ended} state={state} className="max-sm:hidden" />
        <Toolbar state={state} />
      </header>

      <div className="sm:hidden">
        <div role="group" aria-label={m.offer_exchange_side_tabs()} className="flex border-b px-4">
          {sides.map((side) => (
            <button
              key={side.key}
              type="button"
              aria-pressed={state.side === side.key}
              onClick={() => state.setSide(side.key)}
              className={cn(
                "text-muted-foreground -mb-px flex min-h-11 flex-1 items-center justify-center gap-1.5 border-b-2 border-transparent text-sm font-medium",
                state.side === side.key && "text-foreground border-foreground",
              )}
            >
              {side.title}
              <span className="font-mono text-xs tabular-nums opacity-70">{side.legs.length}</span>
            </button>
          ))}
        </div>
        <FilterChips legs={activeLegs} ended={ended} state={state} className="px-4 pt-3" />
      </div>

      <div className="relative grid sm:grid-cols-2">
        {sides.map((side, index) => {
          const status = sideStatus(trade, side.key);
          const groups = exchangeGroups(side.legs, {
            ended,
            filter: state.filter,
            find: state.find,
            collections,
          });
          return (
            <div
              key={side.key}
              className={cn(
                "flex min-w-0 flex-col gap-4 px-4 pt-4 pb-5 sm:px-5",
                index === 1 && "sm:border-s",
                state.side !== side.key && "max-sm:hidden",
              )}
            >
              <div className="flex items-center justify-between gap-2 max-sm:sr-only">
                <h3 className="text-sm font-medium">
                  {side.title}{" "}
                  <span className="text-muted-foreground font-mono text-xs font-normal tabular-nums">
                    {side.legs.length}
                  </span>
                </h3>
                {status ? (
                  <span className={cn("text-xs", SIDE_STATUS[status].ink)}>
                    {SIDE_STATUS[status].text()}
                  </span>
                ) : null}
              </div>
              {side.legs.length === 0 && topupIn !== side.key ? (
                <p className="text-muted-foreground text-sm">{m.offer_side_nothing()}</p>
              ) : groups.length === 0 && side.legs.length > 0 && narrowed ? (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-muted-foreground text-sm">{m.offer_exchange_no_match()}</p>
                  <Button variant="outline" size="sm" onClick={showAll}>
                    {m.offer_exchange_show_all()}
                  </Button>
                </div>
              ) : (
                groups.map((group) => (
                  <Group
                    key={`${group.key}-${group.profile?.address ?? (group.anyCopy ? "any" : "")}`}
                    group={group}
                    ended={ended}
                    collections={collections}
                    state={state}
                    hydrated={hydrated}
                  />
                ))
              )}
              {topupIn === side.key && trade.topup ? (
                <p className="text-warning-foreground flex items-start gap-1.5 text-sm text-pretty">
                  <WarningIcon aria-hidden weight="fill" className="mt-0.5 size-4 shrink-0" />
                  <TopupText topup={trade.topup} />
                </p>
              ) : null}
            </div>
          );
        })}
        <span
          aria-hidden
          className="bg-card text-muted-foreground absolute start-1/2 top-4 -translate-x-1/2 py-1.5 max-sm:hidden rtl:translate-x-1/2"
        >
          <ArrowsLeftRightIcon className="size-4.5" />
        </span>
      </div>
      {trade.note ? (
        <blockquote className="text-muted-foreground border-t px-4 pt-3 pb-4 text-sm wrap-anywhere whitespace-pre-wrap sm:px-5">
          {trade.note}
        </blockquote>
      ) : null}
      {trade.legs.some(
        (leg) =>
          leg.state === "waiting" &&
          [leg, ...leg.substitutes].some((shown) => shown.serial !== null && shown.serialEstimated),
      ) ? (
        <div className="border-t px-4 py-3 sm:px-5">
          <EstimatedSerialNote />
        </div>
      ) : null}
    </section>
  );
}
