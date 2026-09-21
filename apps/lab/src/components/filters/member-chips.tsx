import { Fragment } from "react";

import { useScopedFacets } from "@/components/filters/facets";
import { useFilters } from "@/components/filters/filter-store";
import { memberColor } from "@/components/filters/member-colors";
import { MultiSelect } from "@/components/filters/multi-select";
import type { LabArtist } from "@/fixtures/objekts";
import { cn } from "@/lib/utils";

/**
 * Home's member row: an artist segmented control, then that artist's members.
 * The chip row scrolls with a fade on the right edge; at `md` and below the
 * chips collapse into a "Members" MultiSelect. Both write `member` into the
 * same filter store the Member dropdown uses, so they stay in sync.
 *
 * Neither control carries an "All": `artist: []` / `member: []` already means
 * "everything", and a chip for it would be a second spelling of the empty
 * filter — one the active-chip row could not remove and Clear all could not
 * reach. The segmented control is instead a radio that deselects (pressing the
 * pressed segment writes `artist: []`, round 31), and the member chips simply
 * all sit unpressed (round 34).
 */
export function MemberChips() {
  const { artist, member, set } = useFilters();
  const { groups } = useScopedFacets();

  // the artist dropdown can hold several; the segmented control then shows the first
  const current: LabArtist | null = artist.length === 1 ? (artist[0] as LabArtist) : null;
  const shown = current === null ? groups : groups.filter((g) => g.artist === current);
  const allMembers = shown.flatMap((g) => g.members);

  /** pressing the pressed segment clears the scope; either way keep the members it still covers */
  const pickArtist = (next: LabArtist) => {
    const off = current === next;
    const keep = off
      ? groups.flatMap((g) => g.members)
      : (groups.find((g) => g.artist === next)?.members ?? []);
    set({ artist: off ? [] : [next], member: member.filter((m) => keep.includes(m)) });
  };

  const toggle = (m: string) =>
    set({ member: member.includes(m) ? member.filter((x) => x !== m) : [...member, m] });

  const chip = (label: string, color: string, on: boolean, onClick: () => void) => (
    <button
      key={label}
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "bg-popover flex h-8 flex-none items-center gap-1.75 rounded-full border pr-3 pl-1.25 text-[13px] font-medium",
        on ? "bg-foreground text-background border-foreground" : "hover:border-foreground/30",
      )}
    >
      <span
        className="ring-foreground/15 size-5.5 rounded-full ring-1"
        style={{ background: color }}
      />
      {label}
    </button>
  );

  /* a plain button, so Space and Enter both toggle it the way a click does */
  const segment = (value: LabArtist) => (
    <button
      key={value}
      type="button"
      aria-pressed={current === value}
      onClick={() => pickArtist(value)}
      className={cn(
        "h-6.5 rounded-full px-2.5 text-[12.5px] font-medium whitespace-nowrap",
        current === value
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {value}
    </button>
  );

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        role="group"
        aria-label="Artist"
        className="bg-secondary flex h-8 flex-none items-center gap-0.5 rounded-full p-0.75"
      >
        {groups.map((g) => segment(g.artist))}
      </div>

      {/* chips: scrolling row with a fade mask on the right */}
      <div className="min-w-0 flex-1 max-md:hidden">
        <div
          data-scroll-x
          className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto [mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)] pb-1 [&::-webkit-scrollbar]:hidden"
        >
          {shown.map((group) => (
            <Fragment key={group.artist}>
              {/* only worth labelling once several artists share the row */}
              {shown.length > 1 && (
                <span className="text-muted-foreground flex h-8 flex-none items-center pr-0.5 pl-2 font-mono text-[11px] tracking-wide">
                  {group.artist}
                </span>
              )}
              {group.members.map((m) =>
                chip(m, memberColor(m), member.includes(m), () => toggle(m)),
              )}
            </Fragment>
          ))}
        </div>
      </div>

      <MultiSelect
        label="Members"
        options={allMembers}
        groups={shown}
        value={member}
        onChange={(v) => set({ member: v })}
        className="md:hidden"
      />
    </div>
  );
}
