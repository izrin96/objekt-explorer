import { WarningIcon } from "@phosphor-icons/react";
import { useHydrated } from "@tanstack/react-router";
import { useId } from "react";

import { TONE_INK, TONE_SOLID, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { type ExchangeGroup, type GroupKey } from "./exchange";
import { itemLabel } from "./format";
import { legView } from "./leg-view";
import { ObjektTile } from "./objekt-tile";
import { OfferThumb } from "./offer-item";
import type { Collections } from "./pick";
import type { ExchangeState } from "./trade-exchange";
import { LegSerial } from "./wrong-copy";

const GROUPS: Record<GroupKey, { title: () => string; tone: Tone }> = {
  send: { title: m.offer_group_send, tone: "progress" },
  decide: { title: m.offer_group_decide, tone: "warning" },
  stuck: { title: m.offer_group_stuck, tone: "warning" },
  waiting: { title: m.offer_side_waiting_them, tone: "warning" },
  verified: { title: m.offer_leg_verified, tone: "success" },
  notSent: { title: m.offer_side_not_sent, tone: "neutral" },
};

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
      <span className="text-muted-foreground">{group.legs.length}</span>
    </h4>
  );
}

export function Group({
  group,
  ended,
  collections,
  state,
}: {
  group: ExchangeGroup;
  ended: boolean;
  collections: Collections;
  state: ExchangeState;
}) {
  const hydrated = useHydrated();
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
                  <span className="text-muted-foreground shrink-0 font-mono text-xs">
                    <LegSerial leg={leg} />
                  </span>
                  <span
                    className={cn(
                      "flex shrink-0 items-center gap-1 text-xs",
                      TONE_INK[view.mark.tone],
                    )}
                  >
                    {view.warning ? (
                      <WarningIcon
                        aria-hidden
                        weight="fill"
                        className="text-warning-foreground size-3"
                      />
                    ) : null}
                    <span className="max-sm:sr-only">{view.mark.label}</span>
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
