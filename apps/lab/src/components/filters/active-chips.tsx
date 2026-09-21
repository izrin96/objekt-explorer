import { XIcon } from "@phosphor-icons/react";

import { ArtistAvatar } from "@/components/artist-avatar";
import { memberColor } from "@/components/filters/member-colors";
import { isLabArtist } from "@/fixtures/artists";
import { cn } from "@/lib/utils";

/**
 * A removable chip. `key` is `<facet>:<value>` for the facet chips and a bare
 * flag name for the long-tail switches; the prefix is what decides whether the
 * chip gets an artist logo, a member dot, a colour swatch or the mono
 * treatment, so every surface that builds chips (the shared `activeChips`,
 * Activity's own `chipsOf`) keys them the same way and gets the same row.
 */
export type ActiveChip = { key: string; label: string };

/**
 * The active-filter row from `design/objekt-redesign-mockup.html`: one chip per
 * non-default filter plus a "Clear all" reset. Shared so reset is in the same
 * place, and does the same thing, on every page that filters.
 */
export function ActiveChips<C extends ActiveChip>({
  chips,
  onRemove,
  onReset,
}: {
  chips: readonly C[];
  onRemove: (chip: C) => void;
  onReset: () => void;
}) {
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => {
        const artistName = c.key.startsWith("artist:") ? c.key.slice(7) : null;
        const artist = artistName !== null && isLabArtist(artistName) ? artistName : null;
        const member = c.key.startsWith("member:") ? c.key.slice(7) : null;
        const color = c.key.startsWith("color:") ? c.key.slice(6) : null;
        const mono = c.key.startsWith("collectionNo:") || color !== null;
        const dot = member !== null ? memberColor(member) : color;
        // an artist outside the fixture keeps its name and loses only the logo
        const swatched = artistName !== null || dot !== null;
        return (
          <button
            key={c.key}
            type="button"
            /* a member chip shows only the swatch and the name, so without
               this the button announces as the member and nothing says that
               pressing it drops the filter */
            aria-label={`Remove ${c.label}`}
            onClick={() => onRemove(c)}
            className={cn(
              "bg-secondary hover:bg-muted inline-flex h-6.5 cursor-pointer items-center gap-1.5 rounded-full pr-2 pl-2.5 text-[12.5px] data-member:pl-1",
              mono && "font-mono",
            )}
            data-member={swatched || undefined}
          >
            {artist !== null && <ArtistAvatar artist={artist} className="size-4 ring-0" />}
            {dot !== null && (
              <span
                className="ring-foreground/15 size-4.5 rounded-full ring-1"
                style={{ background: dot }}
              />
            )}
            {artistName ?? member ?? color ?? c.label}
            <XIcon className="size-3 opacity-50" />
          </button>
        );
      })}
      <button
        type="button"
        onClick={onReset}
        className="text-muted-foreground hover:text-foreground h-6.5 cursor-pointer px-1 text-[12.5px]"
      >
        Clear all
      </button>
    </div>
  );
}
