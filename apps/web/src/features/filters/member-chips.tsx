import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import type { ValidArtist } from "@repo/cosmo/types/common";
import {
  Fragment,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TogglePrimitive } from "@/components/ui/toggle";
import { ToggleGroupPrimitive } from "@/components/ui/toggle-group";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { useScopedFacets } from "./facets";
import { useMemberColor } from "./member-colors";
import { useCanonicalFilters, useFilters, useSetFilters } from "./use-filters";

/**
 * A strip that scrolls sideways, with the buttons that say so. The scroller is
 * the toggle group, so the strip is one tab stop and the arrows walk its chips.
 */
function ScrollStrip({
  label,
  value,
  onValueChange,
  children,
}: {
  label: string;
  value: string[];
  onValueChange: (value: string[]) => void;
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
      <ToggleGroupPrimitive
        ref={stripRef}
        multiple
        loopFocus={false}
        value={value}
        onValueChange={onValueChange}
        aria-label={label}
        onScroll={measure}
        data-scroll-x
        className={cn(
          "flex [scrollbar-width:none] gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden",
          edges.end && "[mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)]",
        )}
      >
        {children}
      </ToggleGroupPrimitive>
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
      className="relative size-5.5 border-2 border-(--member)"
      style={{ "--member": color } as CSSProperties}
    >
      {/* keepMounted: without it Base UI preloads every src through a detached
          Image, which ignores `loading="lazy"` and waits for hydration, so the
          visible chips queue behind ~50 full-size photos */}
      {src ? (
        <AvatarImage
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          keepMounted
          className="relative z-1 data-error:hidden"
        />
      ) : null}
      {/* the fallback is the old colour dot, and a near-white one has no edge of its own on light;
          absolute and under the image, which paints over it as soon as it loads,
          even before hydration removes the fallback */}
      <AvatarFallback
        className="inset-ring-foreground/15 absolute inset-0 inset-ring-1"
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

  const selected = member ?? [];
  const current = artist?.length === 1 ? artist[0] : null;
  const shown = current === null ? groups : groups.filter((g) => g.artist.id === current);

  /** `undefined` is pressing the current artist again, back to every artist */
  const pickArtist = (next: ValidArtist | undefined) => {
    const keep =
      next === undefined
        ? groups.flatMap((group) => group.members)
        : (groups.find((group) => group.artist.id === next)?.members ?? []);
    const kept = selected.filter((name) => keep.includes(name));
    setFilters({
      artist: next === undefined ? undefined : [next],
      member: kept.length > 0 ? kept : undefined,
    });
  };

  // below `md` the toolbar's Artist and Member dropdowns stand in for both strips
  return (
    <div className="flex min-w-0 items-center gap-2 max-md:hidden">
      <ToggleGroupPrimitive
        value={current ? [current] : []}
        onValueChange={([next]: ValidArtist[]) => pickArtist(next)}
        loopFocus={false}
        aria-label={m.filter_artist()}
        className="bg-secondary flex flex-none items-center gap-0.5 rounded-full p-0.75"
      >
        {groups.map(({ artist: cosmoArtist }) => (
          <TogglePrimitive
            key={cosmoArtist.id}
            value={cosmoArtist.id}
            className="text-muted-foreground hover:text-foreground data-pressed:bg-background data-pressed:text-foreground h-8 cursor-pointer rounded-full px-3 text-sm font-medium whitespace-nowrap data-pressed:shadow-sm"
          >
            {cosmoArtist.title}
          </TogglePrimitive>
        ))}
      </ToggleGroupPrimitive>

      <div className="min-w-0 flex-1">
        <ScrollStrip
          label={m.filter_member()}
          value={selected}
          onValueChange={(next) => setFilters({ member: next.length > 0 ? next : undefined })}
        >
          {shown.map((group) => (
            <Fragment key={group.artist.id}>
              {shown.length > 1 && (
                <span className="text-muted-foreground flex h-8 flex-none items-center pr-0.5 pl-2 font-mono text-xs tracking-wide">
                  {group.artist.title}
                </span>
              )}
              {group.members.map((name) => (
                <TogglePrimitive
                  key={name}
                  value={name}
                  className="bg-popover data-pressed:bg-foreground data-pressed:text-background data-pressed:border-foreground not-data-pressed:hover:border-foreground/30 flex h-8 flex-none cursor-pointer items-center gap-1.75 rounded-full border pr-3 pl-1.25 text-sm font-medium"
                >
                  <MemberAvatar src={getMember(name)?.profileImageUrl} color={memberColor(name)} />
                  {name}
                </TogglePrimitive>
              ))}
            </Fragment>
          ))}
        </ScrollStrip>
      </div>
    </div>
  );
}
