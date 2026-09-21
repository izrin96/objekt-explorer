import type { ValidArtist } from "@repo/cosmo/types/common";
import { Fragment } from "react";

import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useScopedFacets } from "./facets";
import { useMemberColor } from "./member-colors";
import { MultiSelect } from "./multi-select";
import { useCanonicalFilters, useFilters, useSetFilters } from "./use-filters";

/**
 * Neither control carries an "All": an absent `artist` / `member` parameter
 * already means "everything", and a chip for it would be a second spelling of
 * the empty filter — one the active-chip row could not remove and Reset could
 * not reach.
 */
export function MemberChips() {
  const artist = useFilters((f) => f.artist);
  const member = useCanonicalFilters().member;
  const setFilters = useSetFilters();
  const memberColor = useMemberColor();
  const { groups } = useScopedFacets();

  const selected = member ?? [];
  const current = artist?.length === 1 ? artist[0] : null;
  const shown = current === null ? groups : groups.filter((g) => g.artist.id === current);
  const allMembers = shown.flatMap((group) => group.members);

  const pickArtist = (next: ValidArtist) => {
    const off = current === next;
    const keep = off
      ? groups.flatMap((group) => group.members)
      : (groups.find((group) => group.artist.id === next)?.members ?? []);
    const kept = selected.filter((name) => keep.includes(name));
    setFilters({
      artist: off ? undefined : [next],
      member: kept.length > 0 ? kept : undefined,
    });
  };

  const toggleMember = (name: string) => {
    const next = selected.includes(name)
      ? selected.filter((value) => value !== name)
      : [...selected, name];
    setFilters({ member: next.length > 0 ? next : undefined });
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div
        role="group"
        aria-label={m.filter_artist()}
        className="bg-secondary flex h-8 flex-none items-center gap-0.5 rounded-full p-0.75"
      >
        {groups.map(({ artist: cosmoArtist }) => (
          <button
            key={cosmoArtist.id}
            type="button"
            aria-pressed={current === cosmoArtist.id}
            onClick={() => pickArtist(cosmoArtist.id as ValidArtist)}
            className={cn(
              "h-6.5 cursor-pointer rounded-full px-2.5 text-[12.5px] font-medium whitespace-nowrap",
              current === cosmoArtist.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {cosmoArtist.title}
          </button>
        ))}
      </div>

      <div className="min-w-0 flex-1 max-md:hidden">
        <div
          data-scroll-x
          className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto [mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)] pb-1 [&::-webkit-scrollbar]:hidden"
        >
          {shown.map((group) => (
            <Fragment key={group.artist.id}>
              {shown.length > 1 && (
                <span className="text-muted-foreground flex h-8 flex-none items-center pr-0.5 pl-2 font-mono text-[11px] tracking-wide">
                  {group.artist.title}
                </span>
              )}
              {group.members.map((name) => {
                const on = selected.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleMember(name)}
                    className={cn(
                      "bg-popover flex h-8 flex-none cursor-pointer items-center gap-1.75 rounded-full border pr-3 pl-1.25 text-[13px] font-medium",
                      on
                        ? "bg-foreground text-background border-foreground"
                        : "hover:border-foreground/30",
                    )}
                  >
                    <span
                      className="ring-foreground/15 size-5.5 rounded-full ring-1"
                      style={{ background: memberColor(name) }}
                    />
                    {name}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      <MultiSelect
        label={m.filter_member()}
        options={allMembers}
        groups={shown}
        value={selected}
        onChange={(value) => setFilters({ member: value.length > 0 ? value : undefined })}
        className="md:hidden"
      />
    </div>
  );
}
