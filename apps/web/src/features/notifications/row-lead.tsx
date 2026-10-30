import {
  ArrowsLeftRightIcon,
  CheckIcon,
  ClockIcon,
  HeartIcon,
  type Icon,
  PackageIcon,
  ShieldWarningIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";

import { PersonAvatar } from "@/components/shared/person-avatar";
import type { Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

import type { Collections } from "./stack";
import type { NotificationIcon } from "./tone";

const TONE_ICON: Record<NotificationIcon, Icon> = {
  check: CheckIcon,
  clock: ClockIcon,
  cross: XIcon,
  arrow: ArrowsLeftRightIcon,
  heart: HeartIcon,
  package: PackageIcon,
  shield: ShieldWarningIcon,
  warning: WarningIcon,
};

/** An alert's objekts keep their list type's colour; it is the one colour a row has besides class stripes. */
export const TONE_FRAME: Partial<Record<Tone, string>> = {
  want: "outline-type-want",
  have: "outline-type-have",
};

/** Every leading mark sits in this slot, so the text beside it does not move between kinds. */
const SLOT = "relative flex h-12 w-11 shrink-0";

type Partner = { name: string; image?: string | null };

function Glyph({ icon, className }: { icon: NotificationIcon; className?: string }) {
  const Mark = TONE_ICON[icon];
  return <Mark aria-hidden weight="bold" className={className} />;
}

function Badge({ icon }: { icon: NotificationIcon }) {
  return (
    <span className="bg-popover absolute start-6 top-7.5 z-10 rounded-full p-0.5">
      <span className="bg-muted text-foreground grid size-4.5 place-items-center rounded-full">
        <Glyph icon={icon} className="size-2.5" />
      </span>
    </span>
  );
}

function PartnerFace({ partner, className }: { partner: Partner; className?: string }) {
  return <PersonAvatar name={partner.name} image={partner.image} className={className} />;
}

export function ToneTile({ icon }: { icon: NotificationIcon }) {
  return (
    <span className={SLOT}>
      <span className="bg-muted text-foreground grid h-10 w-7 place-items-center rounded">
        <Glyph icon={icon} className="size-4" />
      </span>
    </span>
  );
}

/** Where each objekt of a stack sits, counted from the front one. */
const DECK = [
  "start-0 top-1",
  "start-1.25 top-0.5 opacity-80",
  "start-2.5 top-0 opacity-50",
] as const;

/** `partner` sits on the stack's other corner, so an offer's objekts still show who it is with. */
export function NotificationStack({
  slugs,
  collections,
  frame,
  badge,
  partner,
}: {
  slugs: readonly string[];
  collections: Collections;
  frame?: string;
  badge?: NotificationIcon;
  partner?: Partner;
}) {
  return (
    <span className={SLOT}>
      {/* the front one last, so it paints over the rest */}
      {slugs
        .map((slug, depth) => ({ slug, depth }))
        .toReversed()
        .map(({ slug, depth }) => (
          <img
            key={depth}
            src={collections[slug]?.thumbnailImage}
            alt=""
            className={cn(
              "aspect-photocard absolute w-7 rounded-sm object-cover",
              DECK[depth],
              frame && ["outline-offset-1", slugs.length > 1 ? "outline-1" : "outline-2", frame],
            )}
          />
        ))}
      {partner ? (
        <span className="bg-popover absolute -start-1.5 top-7.5 z-10 rounded-full p-0.5">
          <PartnerFace partner={partner} className="size-4.5" />
        </span>
      ) : null}
      {badge ? <Badge icon={badge} /> : null}
    </span>
  );
}

export function PartnerAvatar({ partner, icon }: { partner: Partner; icon: NotificationIcon }) {
  return (
    <span className={SLOT}>
      <PartnerFace partner={partner} className="mt-1 size-9 text-sm" />
      <Badge icon={icon} />
    </span>
  );
}
