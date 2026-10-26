import { type Icon, WarningIcon } from "@phosphor-icons/react";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import type { MouseEvent, ReactNode } from "react";

import { getCollectionShortNo } from "@/features/objekt/objekt-utils";
import { TONE_INK, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

import { OfferThumb } from "./offer-item";

export type TileMark = { tone: Tone; icon: Icon; label: string };

type Props = {
  slug: string;
  collection: ValidObjekt | undefined;
  /** the serial, or what stands for it ("any serial") */
  serial: ReactNode;
  /** the tile's accessible name and hover text: the objekt, its serial, and its status */
  label: string;
  mark?: TileMark;
  /** a stuck or away objekt, named by `label` */
  warning?: boolean;
  times?: number;
  /** verified art steps back; the caption keeps full contrast */
  dim?: boolean;
  /** outlined, with the reason under the caption */
  problem?: string | null;
  /** short lines under the caption, such as a copies count or an open-offer warning */
  notes?: { text: string; warning?: boolean }[];
  /** a button over the art's corner, such as remove */
  slot?: ReactNode;
  /** art only: the label alone names it */
  compact?: boolean;
  /** opens the objekt drawer from the art; ignored on a pressable tile */
  onOpen?: (objekt: ValidObjekt) => void;
  /** a pressable tile is one button; `pressed` marks it selected */
  onPress?: (event: MouseEvent<HTMLButtonElement>) => void;
  pressed?: boolean;
  className?: string;
};

/** One objekt as a small card: art with its marks, then member, code and serial. */
export function ObjektTile({
  slug,
  collection,
  serial,
  label,
  mark,
  warning = false,
  times,
  dim = false,
  problem,
  notes = [],
  slot,
  compact = false,
  onOpen,
  onPress,
  pressed,
  className,
}: Props) {
  const body = (
    <>
      <span className="relative block">
        <OfferThumb
          slug={slug}
          collection={collection}
          onOpen={onPress ? undefined : onOpen}
          className={cn("w-full", dim && "opacity-55")}
        />
        {mark ? (
          <span
            aria-hidden
            className={cn(
              "bg-background absolute start-1 top-1 grid size-5 place-items-center rounded-full shadow-xs",
              TONE_INK[mark.tone],
            )}
          >
            <mark.icon weight="bold" className="size-3" />
          </span>
        ) : null}
        {warning ? (
          <span
            aria-hidden
            className="bg-background text-warning-foreground absolute end-1 top-1 grid size-5 place-items-center rounded-full shadow-xs"
          >
            <WarningIcon weight="fill" className="size-3" />
          </span>
        ) : null}
        {times && times > 1 ? (
          <span
            aria-hidden
            className="bg-foreground text-background absolute start-1 bottom-1 rounded-sm px-1 font-mono text-xs leading-4 font-semibold tabular-nums"
          >
            ×{times}
          </span>
        ) : null}
      </span>
      <span className={cn("flex min-w-0 flex-col text-start", compact && "hidden")}>
        <span className="truncate text-xs font-medium">{collection?.member ?? slug}</span>
        {/* a narrow tile puts the serial on its own line rather than cut the code */}
        <span className="text-muted-foreground flex min-w-0 flex-wrap gap-x-1 font-mono text-xs tabular-nums">
          <span className="max-w-full truncate">
            {collection ? getCollectionShortNo(collection) : null}
          </span>
          <span className="max-w-full truncate">{serial}</span>
        </span>
        {problem ? (
          <span className="text-destructive-foreground text-xs text-pretty">{problem}</span>
        ) : null}
        {notes.map((note) => (
          <span
            key={note.text}
            className={cn(
              "text-xs text-pretty",
              note.warning ? "text-warning-foreground" : "text-muted-foreground",
            )}
          >
            {note.text}
          </span>
        ))}
      </span>
    </>
  );

  const frame = cn(
    "relative flex min-w-0 flex-col gap-1.5 rounded-lg",
    !compact && "p-1",
    problem && "ring-destructive/50 ring-2",
    className,
  );

  if (onPress) {
    return (
      <button
        type="button"
        aria-pressed={pressed}
        aria-label={label}
        title={label}
        onClick={onPress}
        className={cn(
          frame,
          "hover:bg-accent/60 focus-visible:ring-ring outline-none focus-visible:ring-2",
          pressed && "bg-accent ring-foreground/30 ring-2",
        )}
      >
        {body}
      </button>
    );
  }

  return (
    <figure aria-label={label} title={label} className={cn(frame, "m-0")}>
      {body}
      {slot ? <span className="absolute end-1.5 top-1.5 z-10">{slot}</span> : null}
    </figure>
  );
}
