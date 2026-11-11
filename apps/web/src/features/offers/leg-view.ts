import {
  CheckIcon,
  ClockIcon,
  type Icon,
  MinusIcon,
  PaperPlaneTiltIcon,
  WarningIcon,
} from "@phosphor-icons/react";

import { untilLabel } from "@/lib/time";
import { type Tone } from "@/lib/tone";
import { m } from "@/paraglide/messages";

import { type LegStatus, legStatus } from "./exchange";
import { itemLabel } from "./format";
import type { Leg, LegChip } from "./next-step";
import { type TileMark } from "./objekt-tile";
import type { Collections } from "./pick";

const LEG_MARKS: Record<LegChip, { tone: Tone; icon: Icon; label: () => string }> = {
  verified: { tone: "success", icon: CheckIcon, label: m.offer_leg_verified },
  confirmed: { tone: "success", icon: CheckIcon, label: m.offer_leg_confirmed },
  waiting: { tone: "warning", icon: ClockIcon, label: m.offer_leg_waiting_short },
  sendThis: { tone: "progress", icon: PaperPlaneTiltIcon, label: m.offer_leg_send_this },
  differentCopy: { tone: "warning", icon: WarningIcon, label: m.offer_side_different },
  notSent: { tone: "neutral", icon: MinusIcon, label: m.offer_side_not_sent },
};

/**
 * A stuck or away leg's warning, while it waits. The away date is in the viewer's zone, unknown
 * to the server render, so it waits for the client.
 */
function legWarning(leg: Leg, { warning }: LegStatus, hydrated: boolean) {
  if (warning === "stuck") return m.offer_leg_stuck();
  if (warning === "away" && leg.away && hydrated) {
    return m.offer_leg_away({ date: untilLabel(leg.away.breaksAt) });
  }
  return null;
}

/** What a tile and a list row say about a leg: its mark and its accessible name. */
export function legView(leg: Leg, ended: boolean, collections: Collections, hydrated: boolean) {
  const status = legStatus(leg, ended);
  const chip = LEG_MARKS[status.chip];
  const mark: TileMark = { tone: chip.tone, icon: chip.icon, label: chip.label() };
  const warning = legWarning(leg, status, hydrated);
  const label = [itemLabel(leg, collections), mark.label, warning].filter(Boolean).join(" · ");
  return { status, mark, warning, label };
}
