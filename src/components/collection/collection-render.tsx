import type { CSSProperties } from "react";

export function ObjektsRender<T>({
  items,
  columns,
  children,
}: {
  items: T[];
  columns: number;
  children: (props: { items: T[]; rowIndex: number }) => React.ReactElement;
}) {
  return Array.from({
    length: Math.ceil(items.length / columns),
  }).map((_, rowIndex) => {
    const start = rowIndex * columns;
    const end = start + columns;

    return children({ items: items.slice(start, end), rowIndex });
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
      className="grid grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))] gap-3 pb-4 lg:gap-4"
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
