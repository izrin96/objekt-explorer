import { ArrowClockwiseIcon, CardsThreeIcon, CheckIcon, WarningIcon } from "@phosphor-icons/react";
import { type CandidateItem, OFFER_SIDE_LIMIT } from "@repo/api/schemas/offer";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useId, useState } from "react";
import { VList } from "virtua";

import { EmptyState } from "@/components/shared/empty-state";
import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useScopedFacets } from "@/features/filters/facets";
import { SingleSelect } from "@/features/filters/single-select";
import { ObjektCard } from "@/features/objekt/objekt-card";
import { CollectionLabel } from "@/features/objekt/objekt-label";
import { useUserLists } from "@/features/user/hooks";
import { useElementSize } from "@/hooks/use-element-size";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { offerNo, offerRefusalOf, offerRefusalText } from "./format";
import {
  myCandidatesOptions,
  type OfferAddress,
  type PickerFilters,
  theirPickerOptions,
} from "./queries";

export type OfferSide = "give" | "get";

export type OfferPick = {
  key: string;
  collectionSlug: string;
  /** null asks for any copy */
  objektId: string | null;
  serial: number | null;
  listSlug: string | null;
  /** null when the pick did not come from candidates, as in a counter's prefill */
  flags: Pick<CandidateItem, "transferable" | "reserved" | "inOpenOffer" | "copies"> | null;
  /** a counter keeps what the countered offer gave, listed or not */
  kept?: boolean;
  /** the any-copy placeholder this resolved copy stands in for */
  replaces?: string;
};

type Collections = Readonly<Record<string, ValidObjekt | undefined>>;

export const pickKey = (item: Pick<CandidateItem, "collectionSlug" | "objektId">) =>
  item.objektId ?? `any:${item.collectionSlug}`;

export function toPick(item: CandidateItem): OfferPick {
  return {
    key: pickKey(item),
    collectionSlug: item.collectionSlug,
    objektId: item.objektId,
    serial: item.serial,
    listSlug: item.listSlug,
    flags: {
      transferable: item.transferable,
      reserved: item.reserved,
      inOpenOffer: item.inOpenOffer,
      copies: item.copies,
    },
  };
}

/** Why a pick can't go in an offer, or null when it can. */
export function blockedReason(flags: OfferPick["flags"]) {
  if (!flags) return null;
  if (!flags.transferable) return m.offer_flag_not_transferable();
  if (flags.reserved) return m.offer_flag_reserved();
  return null;
}

export function OfferPicker({
  open,
  onOpenChange,
  side,
  to,
  name,
  picked,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side: OfferSide;
  to: OfferAddress;
  name: string;
  picked: OfferPick[];
  onDone: (picks: OfferPick[], collections: Collections) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="h-[min(48rem,calc(100dvh-(--spacing(8))))] max-w-3xl max-sm:h-[calc(100dvh-(--spacing(12)))]">
        <PickerBody side={side} to={to} name={name} picked={picked} onDone={onDone} />
      </DialogPopup>
    </Dialog>
  );
}

function PickerBody({
  side,
  to,
  name,
  picked,
  onDone,
}: {
  side: OfferSide;
  to: OfferAddress;
  name: string;
  picked: OfferPick[];
  onDone: (picks: OfferPick[], collections: Collections) => void;
}) {
  const [selection, setSelection] = useState(() => new Map(picked.map((p) => [p.key, p])));
  const [seen, setSeen] = useState<Record<string, ValidObjekt>>({});
  const full = selection.size >= OFFER_SIDE_LIMIT;

  const toggle = (item: CandidateItem, collections: Collections) => {
    const key = pickKey(item);
    setSelection((current) => {
      const next = new Map(current);
      if (next.has(key)) next.delete(key);
      else if (next.size < OFFER_SIDE_LIMIT) next.set(key, toPick(item));
      return next;
    });
    const collection = collections[item.collectionSlug];
    if (collection) setSeen((current) => ({ ...current, [item.collectionSlug]: collection }));
  };

  const grid = {
    isSelected: (item: CandidateItem) => selection.has(pickKey(item)),
    full,
    onToggle: toggle,
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">
          {side === "give" ? m.offer_add_mine() : m.offer_add_theirs({ name })}
        </DialogTitle>
        <DialogDescription>
          {side === "give" ? m.offer_picker_mine_desc() : m.offer_picker_theirs_desc({ name })}
        </DialogDescription>
      </DialogHeader>
      <div className="flex min-h-0 flex-1 flex-col px-6 pb-4">
        {side === "give" ? (
          <MineGrid to={to} {...grid} />
        ) : (
          <TheirsGrid to={to} name={name} {...grid} />
        )}
      </div>
      <DialogFooter className="sm:items-center">
        <p
          className="text-muted-foreground font-mono text-xs tabular-nums sm:me-auto"
          aria-live="polite"
        >
          {m.offer_picker_count({ count: selection.size, max: OFFER_SIDE_LIMIT })}
        </p>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button onClick={() => onDone([...selection.values()], seen)}>
          {m.offer_picker_done()}
        </Button>
      </DialogFooter>
    </>
  );
}

type GridProps = {
  to: OfferAddress;
  isSelected: (item: CandidateItem) => boolean;
  full: boolean;
  onToggle: (item: CandidateItem, collections: Collections) => void;
};

const ALL = "all";

/** Member, season and class, plus the side's own "only what matches" switch. */
function PickerFilterBar({
  filters,
  onChange,
  matchLabel,
}: {
  filters: PickerFilters;
  onChange: (next: PickerFilters) => void;
  matchLabel: string;
}) {
  const { facets } = useScopedFacets();
  const switchId = useId();
  const select = (key: "member" | "season" | "class", label: string, values: readonly string[]) => (
    <SingleSelect
      label={label}
      options={[
        { value: ALL, label: m.filter_all() },
        ...values.map((value) => ({ value, label: value })),
      ]}
      value={filters[key][0] ?? ALL}
      defaultValue={ALL}
      onChange={(value) => onChange({ ...filters, [key]: value === ALL ? [] : [value] })}
    />
  );

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {select("member", m.filter_member(), facets.members)}
      {select("season", m.filter_season(), facets.seasons)}
      {select("class", m.filter_class(), facets.classes)}
      <span className="flex items-center gap-2">
        <Switch
          id={switchId}
          checked={filters.matchOnly}
          onCheckedChange={(matchOnly) => onChange({ ...filters, matchOnly })}
        />
        <Label htmlFor={switchId} className="text-sm">
          {matchLabel}
        </Label>
      </span>
    </div>
  );
}

const narrowed = (filters: PickerFilters) =>
  filters.matchOnly || filters.member.length + filters.season.length + filters.class.length > 0;

const NO_FILTERS: PickerFilters = { member: [], season: [], class: [], matchOnly: false };

function MineGrid({ to, ...grid }: GridProps) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const query = useInfiniteQuery(myCandidatesOptions(to, filters));

  const pages = query.data?.pages ?? [];
  const collections: Collections = Object.assign({}, ...pages.map((page) => page.collections));
  const suggested = pages[0]?.suggested ?? [];
  const items = pages.flatMap((page) => page.items);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PickerFilterBar
        filters={filters}
        onChange={setFilters}
        matchLabel={m.offer_picker_only_they_want()}
      />
      <CandidateGrid
        {...grid}
        sections={[
          { title: m.offer_picker_suggested(), items: suggested },
          { title: suggested.length > 0 ? m.offer_picker_all_mine() : null, items },
        ]}
        collections={collections}
        pending={query.isPending}
        error={query.isError && items.length === 0 ? loadError(query.error, query.refetch) : null}
        empty={
          narrowed(filters)
            ? { title: m.offer_picker_filtered() }
            : { title: m.offer_picker_mine_empty() }
        }
        more={{
          has: query.hasNextPage,
          loading: query.isFetchingNextPage,
          failed: query.isFetchNextPageError,
          load: () => void query.fetchNextPage(),
        }}
      />
    </div>
  );
}

function TheirsGrid({ to, name, ...grid }: GridProps & { name: string }) {
  // what they have that the sender wants comes first, when the sender keeps a want list
  const wantsSomething = useUserLists().some((list) => list.listTypeNew === "want");
  const [filters, setFilters] = useState<PickerFilters>({
    ...NO_FILTERS,
    matchOnly: wantsSomething,
  });
  const query = useInfiniteQuery(theirPickerOptions(to, filters));

  const pages = query.data?.pages ?? [];
  const collections: Collections = Object.assign({}, ...pages.map((page) => page.collections));
  const items = pages.flatMap((page) => page.items);
  const listed = pages[0]?.listed ?? true;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PickerFilterBar
        filters={filters}
        onChange={setFilters}
        matchLabel={m.offer_picker_only_i_want()}
      />
      <CandidateGrid
        {...grid}
        sections={[{ title: null, items }]}
        collections={collections}
        pending={query.isPending}
        error={query.isError && items.length === 0 ? loadError(query.error, query.refetch) : null}
        empty={
          narrowed(filters)
            ? { title: m.offer_picker_filtered() }
            : listed
              ? {
                  title: m.offer_picker_theirs_none_held({ name }),
                  hint: m.offer_picker_theirs_none_held_hint(),
                }
              : {
                  title: m.offer_picker_theirs_none_listed({ name }),
                  hint: m.offer_picker_theirs_none_listed_hint(),
                }
        }
        more={{
          has: query.hasNextPage,
          loading: query.isFetchingNextPage,
          failed: query.isFetchNextPageError,
          load: () => void query.fetchNextPage(),
        }}
      />
    </div>
  );
}

function loadError(error: unknown, refetch: () => Promise<unknown>) {
  const refusal = offerRefusalOf(error);
  return {
    retry: () => void refetch(),
    text: refusal ? (offerRefusalText(refusal, m.offer_refused_some()) ?? null) : null,
  };
}

type Row =
  | { type: "title"; key: string; title: string }
  | { type: "row"; key: string; items: CandidateItem[] }
  | { type: "more"; key: string };

/** Card width the grid aims for; the column count follows the dialog's width. */
const CELL_PX = 112;

function CandidateGrid({
  sections,
  collections,
  pending,
  error,
  empty,
  more,
  isSelected,
  full,
  onToggle,
}: {
  sections: { title: string | null; items: CandidateItem[] }[];
  collections: Collections;
  pending: boolean;
  error: { retry: () => void; text: string | null } | null;
  empty: { title: string; hint?: string };
  more?: { has: boolean; loading: boolean; failed: boolean; load: () => void };
  isSelected: (item: CandidateItem) => boolean;
  full: boolean;
  onToggle: (item: CandidateItem, collections: Collections) => void;
}) {
  const [ref, { width }] = useElementSize<HTMLDivElement>();
  const columns = Math.max(3, Math.floor(width / CELL_PX));

  if (pending) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="rounded-photocard aspect-photocard" />
        ))}
      </div>
    );
  }
  if (error) {
    if (error.text) {
      return (
        <p role="alert" className="text-sm text-pretty">
          {error.text}
        </p>
      );
    }
    return (
      <EmptyState
        icon={WarningIcon}
        bordered={false}
        title={m.common_error_loading_data()}
        action={
          <Button variant="outline" size="sm" onClick={error.retry}>
            <ArrowClockwiseIcon />
            {m.common_error_retry()}
          </Button>
        }
      />
    );
  }
  if (sections.every((section) => section.items.length === 0)) {
    return (
      <EmptyState icon={CardsThreeIcon} bordered={false} title={empty.title} hint={empty.hint} />
    );
  }

  const rows: Row[] = [];
  for (const [index, section] of sections.entries()) {
    if (section.items.length === 0) continue;
    if (section.title) rows.push({ type: "title", key: `t${index}`, title: section.title });
    for (let i = 0; i < section.items.length; i += columns) {
      rows.push({ type: "row", key: `r${index}:${i}`, items: section.items.slice(i, i + columns) });
    }
  }
  if (more?.has) rows.push({ type: "more", key: "more" });

  return (
    <div ref={ref} className="min-h-0 flex-1">
      {width > 0 ? (
        <VList data={rows} style={{ height: "100%" }} className="overscroll-contain">
          {(row) =>
            row.type === "title" ? (
              <h4 key={row.key} className="pt-1 pb-2 text-sm font-medium">
                {row.title}
              </h4>
            ) : row.type === "more" && more ? (
              <InfiniteSentinel
                key={row.key}
                label={m.infinite_query_load_more_aria()}
                hasNextPage={more.has}
                isFetchingNextPage={more.loading}
                isError={more.failed}
                fetchNextPage={more.load}
              />
            ) : row.type === "row" ? (
              <ul
                key={row.key}
                className="grid gap-2 pb-3"
                style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {row.items.map((item) => (
                  <li key={pickKey(item)} className="min-w-0">
                    <CandidateTile
                      item={item}
                      collection={collections[item.collectionSlug]}
                      selected={isSelected(item)}
                      full={full}
                      onToggle={() => onToggle(item, collections)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div key={row.key} />
            )
          }
        </VList>
      ) : null}
    </div>
  );
}

export function CandidateTile({
  item,
  collection,
  selected,
  full,
  onToggle,
}: {
  item: CandidateItem;
  collection: ValidObjekt | undefined;
  selected: boolean;
  full: boolean;
  onToggle: () => void;
}) {
  const blocked = blockedReason(item);
  // focusable while unavailable, so the reason under it is read with it
  const unavailable = blocked !== null || (full && !selected);
  const detail =
    item.objektId === null
      ? m.offer_any_copy_count({ count: item.copies ?? 0 })
      : item.serial !== null
        ? `#${item.serial}`
        : null;

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-disabled={unavailable || undefined}
      onClick={() => {
        if (!unavailable) onToggle();
      }}
      className="group/tile focus-visible:ring-ring flex w-full flex-col gap-1 rounded-md text-start outline-none focus-visible:ring-2 aria-disabled:cursor-not-allowed"
    >
      {/* a container, so the selection ring's photocard radius measures the tile, not the page */}
      <span className="@container relative block">
        <span className={cn("block", blocked && "opacity-40 grayscale")}>
          {collection ? (
            <ObjektCard objekt={collection} image="thumbnail" hideLabel hideSerial />
          ) : (
            <span className="bg-muted text-muted-foreground rounded-photocard aspect-photocard grid place-items-center p-1 text-center font-mono text-xs break-all">
              {item.collectionSlug}
            </span>
          )}
        </span>
        {/* monochrome on purpose: the class stripes stay the only colour in the grid */}
        {selected ? (
          <span className="rounded-photocard border-foreground pointer-events-none absolute inset-0 grid place-items-start justify-end border-2 p-1">
            <span className="bg-foreground text-background grid size-5 place-items-center rounded-full">
              <CheckIcon weight="bold" className="size-3" />
            </span>
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-col text-xs leading-tight">
        <span className="font-medium break-words">
          <CollectionLabel slug={item.collectionSlug} collection={collection} />
        </span>
        {detail ? (
          <span className="text-muted-foreground font-mono tabular-nums">{detail}</span>
        ) : null}
        {blocked ? (
          <span className="text-destructive-foreground">{blocked}</span>
        ) : item.inOpenOffer.length > 0 ? (
          <span className="text-warning-foreground">
            {m.offer_flag_in_open_offer({ offers: item.inOpenOffer.map(offerNo).join(", ") })}
          </span>
        ) : null}
      </span>
    </button>
  );
}
