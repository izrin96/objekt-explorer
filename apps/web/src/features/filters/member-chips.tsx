import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import type { ValidArtist } from "@repo/cosmo/types/common";
import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useScopedFacets } from "./facets";
import { useMemberColor } from "./member-colors";
import { MultiSelect } from "./multi-select";
import { useCanonicalFilters, useFilters, useSetFilters } from "./use-filters";

/**
 * APG toolbar pattern: the strip is one tab stop and the arrows walk its chips,
 * so a keyboard user reaches the search field in one Tab rather than 60.
 */
function useRovingChips() {
  const [active, setActive] = useState(0);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const all = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-chip]"));
    if (all.length === 0) return;
    const from = all.findIndex((chip) => chip === event.target);
    const next =
      event.key === "ArrowRight"
        ? Math.min(from + 1, all.length - 1)
        : event.key === "ArrowLeft"
          ? Math.max(from - 1, 0)
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? all.length - 1
              : -1;
    if (next < 0) return;
    event.preventDefault();
    setActive(next);
    all[next]?.focus();
  };

  return {
    onKeyDown,
    /* an index past the end leaves the strip with no tab stop at all, so it is
       clamped rather than reset when the artist scope shrinks the chip list */
    chipProps: (index: number, count: number) => ({
      "data-chip": true,
      tabIndex: index === Math.min(active, count - 1) ? 0 : -1,
      onFocus: () => setActive(index),
    }),
  };
}

/** A strip that scrolls sideways, with the buttons that say so. */
function ScrollStrip({
  label,
  onKeyDown,
  children,
}: {
  label: string;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  children: ReactNode;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  const measure = useCallback(() => {
    const node = stripRef.current;
    if (!node) return;
    const max = node.scrollWidth - node.clientWidth;
    const start = node.scrollLeft > 1;
    const end = node.scrollLeft < max - 1;
    // same object back when nothing moved: this runs after every render
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  // no dep array: the chip list changes with the artist scope, and its width is
  // only knowable once the new chips are laid out
  useLayoutEffect(measure);

  useLayoutEffect(() => {
    const node = stripRef.current;
    if (!node) return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [measure]);

  const page = (direction: -1 | 1) =>
    stripRef.current?.scrollBy({ left: direction * stripRef.current.clientWidth * 0.8 });

  return (
    <div className="relative min-w-0 flex-1">
      <div
        ref={stripRef}
        role="group"
        aria-label={label}
        onKeyDown={onKeyDown}
        onScroll={measure}
        data-scroll-x
        className={cn(
          "flex [scrollbar-width:none] gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden",
          edges.end && "[mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)]",
        )}
      >
        {children}
      </div>
      {edges.start && <ScrollButton direction={-1} onClick={() => page(-1)} />}
      {edges.end && <ScrollButton direction={1} onClick={() => page(1)} />}
    </div>
  );
}

function ScrollButton({ direction, onClick }: { direction: -1 | 1; onClick: () => void }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={direction === -1 ? m.filter_scroll_prev() : m.filter_scroll_next()}
      onClick={onClick}
      className={cn(
        "bg-popover hover:border-foreground/30 absolute top-0 grid size-8 cursor-pointer place-items-center rounded-full border shadow-sm",
        direction === -1 ? "left-0" : "right-0",
      )}
    >
      {direction === -1 ? <CaretLeftIcon /> : <CaretRightIcon />}
    </button>
  );
}

/**
 * 22px overall: the member colour is a border rather than a ring, so the outline
 * stays inside the dot's old footprint and the chip keeps its spacing.
 */
function MemberAvatar({ src, color }: { src: string | undefined; color: string }) {
  return (
    <Avatar
      className="size-5.5 border-2 border-(--member)"
      style={{ "--member": color } as CSSProperties}
    >
      {src ? (
        <AvatarImage src={src} alt="" loading="lazy" decoding="async" draggable={false} />
      ) : null}
      {/* the fallback is the old colour dot, and a near-white one has no edge of its own on light */}
      <AvatarFallback
        className="inset-ring-foreground/15 inset-ring-1"
        style={{ background: color }}
      />
    </Avatar>
  );
}

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
  const { getMember } = useCosmoArtist();
  const { groups } = useScopedFacets();
  const artistRoving = useRovingChips();
  const memberRoving = useRovingChips();

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

  // below `md` the artist switch and the Member dropdown share a row a 320px
  // phone cannot fit, so the dropdown drops under the switch there
  return (
    <div className="flex min-w-0 items-center gap-2 max-md:flex-wrap">
      <div
        role="group"
        aria-label={m.filter_artist()}
        onKeyDown={artistRoving.onKeyDown}
        className="bg-secondary flex flex-none items-center gap-0.5 rounded-full p-0.75"
      >
        {groups.map(({ artist: cosmoArtist }, index) => (
          <button
            key={cosmoArtist.id}
            type="button"
            aria-pressed={current === cosmoArtist.id}
            onClick={() => pickArtist(cosmoArtist.id as ValidArtist)}
            {...artistRoving.chipProps(index, groups.length)}
            className={cn(
              "h-8 cursor-pointer rounded-full px-3 text-sm font-medium whitespace-nowrap",
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
        <ScrollStrip label={m.filter_member()} onKeyDown={memberRoving.onKeyDown}>
          {shown.map((group) => (
            <Fragment key={group.artist.id}>
              {shown.length > 1 && (
                <span className="text-muted-foreground flex h-8 flex-none items-center pr-0.5 pl-2 font-mono text-xs tracking-wide">
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
                    {...memberRoving.chipProps(allMembers.indexOf(name), allMembers.length)}
                    className={cn(
                      "bg-popover flex h-8 flex-none cursor-pointer items-center gap-1.75 rounded-full border pr-3 pl-1.25 text-sm font-medium",
                      on
                        ? "bg-foreground text-background border-foreground"
                        : "hover:border-foreground/30",
                    )}
                  >
                    <MemberAvatar
                      src={getMember(name)?.profileImageUrl}
                      color={memberColor(name)}
                    />
                    {name}
                  </button>
                );
              })}
            </Fragment>
          ))}
        </ScrollStrip>
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
