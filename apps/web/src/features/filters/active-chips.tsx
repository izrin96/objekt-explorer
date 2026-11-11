import { XIcon } from "@phosphor-icons/react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { ArtistAvatar } from "@/features/artist/artist-avatar";
import { useCosmoArtist } from "@/features/artist/use-cosmo-artist";
import { FOCUS_RING } from "@/lib/a11y";
import { cn, scrollXOnlyClass } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import type { ActiveChip } from "./use-active-chips";

export function ActiveChips({
  chips,
  onRemove,
}: {
  chips: readonly ActiveChip[];
  onRemove: (chip: ActiveChip) => void;
}) {
  const { getArtist } = useCosmoArtist();
  if (chips.length === 0) return null;

  return (
    <ScrollArea data-scroll-x scrollFade className={scrollXOnlyClass}>
      <div className="flex w-max items-center gap-1.5 pb-0.5">
        {chips.map((chip) => {
          const artist = chip.artistId !== undefined ? getArtist(chip.artistId) : undefined;
          const swatched = artist !== undefined || chip.dot !== undefined;
          return (
            <button
              key={chip.key}
              type="button"
              aria-label={m.filter_remove_chip({ label: chip.label })}
              onClick={() => onRemove(chip)}
              className={cn(
                FOCUS_RING,
                "bg-secondary hover:bg-input inline-flex h-6.5 flex-none cursor-pointer items-center gap-1.5 rounded-full pr-2 pl-2.5 text-xs whitespace-nowrap data-swatched:pl-1",
              )}
              data-swatched={swatched || undefined}
            >
              {artist !== undefined && <ArtistAvatar artist={artist} className="size-4 ring-0" />}
              {chip.dot !== undefined && (
                <span
                  className="ring-foreground/15 size-4.5 rounded-full ring-1"
                  style={{ background: chip.dot }}
                />
              )}
              {chip.value === undefined ? (
                chip.label
              ) : (
                <span>
                  {chip.name !== undefined && `${chip.name}: `}
                  <span className={cn(chip.mono && "font-mono")}>{chip.value}</span>
                </span>
              )}
              <XIcon className="size-3 opacity-50" />
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
