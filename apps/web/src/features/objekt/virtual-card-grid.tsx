import { type ReactNode, useCallback, useRef, useState } from "react";
import { Virtualizer, VList, type VListHandle } from "virtua";

import { InfiniteSentinel } from "@/components/shared/infinite-sentinel";
import { m } from "@/paraglide/messages";

import { useCardColumns } from "./card-grid";

type Row<T> =
  | { type: "title"; key: string; title: string }
  | { type: "row"; key: string; items: T[] }
  | { type: "more"; key: string };

/**
 * `load` must not cancel a page in flight (`fetchNextPage({ cancelRefetch: false })`): the scroll
 * handler and the sentinel can both call it before `loading` has rendered, and a cancelled page is
 * sent again.
 */
type More = { has: boolean; loading: boolean; failed: boolean; load: () => void };

type GridProps<T> = {
  sections: { title: string | null; items: readonly T[] }[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
  more?: More;
};

function cardRows<T>(sections: GridProps<T>["sections"], columns: number, more?: More) {
  const rows: Row<T>[] = [];
  for (const [index, section] of sections.entries()) {
    if (section.items.length === 0) continue;
    if (section.title) rows.push({ type: "title", key: `t${index}`, title: section.title });
    for (let i = 0; i < section.items.length; i += columns) {
      rows.push({ type: "row", key: `r${index}:${i}`, items: section.items.slice(i, i + columns) });
    }
  }
  if (more?.has) rows.push({ type: "more", key: "more" });
  return rows;
}

function CardRow<T>({
  row,
  columns,
  getKey,
  renderItem,
  more,
}: Omit<GridProps<T>, "sections"> & { row: Row<T>; columns: number }) {
  if (row.type === "title") {
    return <h4 className="pt-1 pb-2 text-sm font-medium">{row.title}</h4>;
  }
  if (row.type === "more") {
    return more ? (
      <InfiniteSentinel
        label={m.infinite_query_load_more_aria()}
        hasNextPage={more.has}
        isFetchingNextPage={more.loading}
        isError={more.failed}
        fetchNextPage={more.load}
      />
    ) : null;
  }
  return (
    // each row is a list of its own, so it announces as no list at all
    <ul
      role="presentation"
      className="grid gap-2 pb-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {row.items.map((item) => (
        <li key={getKey(item)} role="presentation" className="@container min-w-0">
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}

/**
 * The sentinel's early margin is measured against the window, which a scroller of its own clips,
 * so it would only fetch once the last row shows; start the next page a viewport ahead instead.
 */
function loadAhead(scroll: { size: number; offset: number; viewport: number }, more?: More) {
  if (!more?.has || more.loading || more.failed) return;
  if (scroll.size - scroll.offset - scroll.viewport < scroll.viewport) more.load();
}

/**
 * A card grid virtualised by row inside a fixed-height container, such as a dialog's body.
 * It fills its flex parent, so the parent sets the height.
 */
export function VirtualCardGrid<T>({ sections, getKey, renderItem, more }: GridProps<T>) {
  const { ref, measured, columns } = useCardColumns<HTMLDivElement>();
  const list = useRef<VListHandle>(null);
  const rows = cardRows(sections, columns, more);

  return (
    <div ref={ref} className="min-h-0 flex-1">
      {measured ? (
        <VList
          ref={list}
          data={rows}
          onScroll={() => {
            const handle = list.current;
            if (!handle) return;
            loadAhead(
              {
                size: handle.scrollSize,
                offset: handle.scrollOffset,
                viewport: handle.viewportSize,
              },
              more,
            );
          }}
          style={{ height: "100%" }}
          className="overscroll-contain"
        >
          {(row) => (
            <CardRow
              key={row.key}
              row={row}
              columns={columns}
              getKey={getKey}
              renderItem={renderItem}
              more={more}
            />
          )}
        </VList>
      ) : null}
    </div>
  );
}

/**
 * The scroll area's viewport around a node, and how far down its content the node starts, kept
 * up to date as what sits above it changes.
 */
function useScrollAreaPlacement() {
  const viewport = useRef<HTMLElement | null>(null);
  const [startMargin, setStartMargin] = useState<number | null>(null);

  const ref = useCallback((node: HTMLDivElement | null) => {
    const scroller = node?.closest<HTMLElement>("[data-slot=scroll-area-viewport]");
    if (!node || !scroller) return undefined;
    viewport.current = scroller;
    const measure = () =>
      setStartMargin(
        node.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop,
      );
    const observer = new ResizeObserver(measure);
    for (const child of scroller.children) observer.observe(child);
    measure();
    return () => {
      observer.disconnect();
      viewport.current = null;
    };
  }, []);

  return { ref, viewport, startMargin };
}

/**
 * `VirtualCardGrid` for a `SheetPanel` or `DialogPanel`: it virtualises inside the panel's own
 * scroll area, so the panel keeps its edge fades and scrollbar, and what sits above the grid in
 * the panel scrolls away with it. Outside a `ScrollArea` it has no scroller and draws nothing.
 */
export function PanelCardGrid<T>({ sections, getKey, renderItem, more }: GridProps<T>) {
  const { ref, measured, columns } = useCardColumns<HTMLDivElement>();
  const { ref: placeRef, viewport, startMargin } = useScrollAreaPlacement();
  const rows = cardRows(sections, columns, more);
  const attach = useCallback(
    (node: HTMLDivElement | null) => {
      const unsize = ref(node);
      const unplace = placeRef(node);
      return () => {
        unsize?.();
        unplace?.();
      };
    },
    [ref, placeRef],
  );

  return (
    <div ref={attach}>
      {measured && startMargin !== null ? (
        <Virtualizer
          data={rows}
          scrollRef={viewport}
          startMargin={startMargin}
          onScroll={() => {
            const scroller = viewport.current;
            if (!scroller) return;
            loadAhead(
              {
                size: scroller.scrollHeight,
                offset: scroller.scrollTop,
                viewport: scroller.clientHeight,
              },
              more,
            );
          }}
        >
          {(row) => (
            <CardRow
              key={row.key}
              row={row}
              columns={columns}
              getKey={getKey}
              renderItem={renderItem}
              more={more}
            />
          )}
        </Virtualizer>
      ) : null}
    </div>
  );
}
