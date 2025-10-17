import type { CSSProperties } from "react";

export function makeObjektRows<T>({
  items,
  columns,
  renderItem,
}: {
  items: T[];
  columns: number;
  renderItem: (props: { items: T[]; rowIndex: number }) => React.ReactElement;
}) {
  return Array.from({
    length: Math.ceil(items.length / columns),
  }).map((_, rowIndex) => {
    const start = rowIndex * columns;
    const end = start + columns;

    return renderItem({ items: items.slice(start, end), rowIndex });
  });
}

export function ObjektsRenderRow<T>({
  items,
  columns,
  rowIndex,
  children,
}: {
  items: T[];
  columns: number;
  rowIndex: number;
  children: (props: { item: T; index: number }) => React.ReactElement;
}) {
  return (
    <div
      className="grid grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))] gap-2 pb-2 sm:gap-2.5 sm:pb-2.5 md:gap-3 md:pb-3 lg:gap-3.5 lg:pb-3.5"
      style={{ "--grid-columns": columns } as CSSProperties}
    >
      {items.map((item, j) => {
        const index = rowIndex * columns + j;
        return children({
          item,
          index,
        });
      })}
    </div>
  );
}
