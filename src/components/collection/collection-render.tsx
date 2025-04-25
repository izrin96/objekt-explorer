import { ValidObjekt } from "@/lib/universal/objekts";
import { CSSProperties } from "react";

export function ObjektsRender({
  objekts,
  columns,
  children,
}: {
  objekts: ValidObjekt[][];
  columns: number;
  children: (props: {
    objekts: ValidObjekt[][];
    rowIndex: number;
  }) => React.ReactElement;
}) {
  return Array.from({
    length: Math.ceil(objekts.length / columns),
  }).map((_, rowIndex) => {
    const start = rowIndex * columns;
    const end = start + columns;

    return children({ objekts: objekts.slice(start, end), rowIndex });
  });
}

export function ObjektsRenderRow({
  objekts,
  columns,
  rowIndex,
  children,
}: {
  objekts: ValidObjekt[][];
  columns: number;
  rowIndex: number;
  children: (props: {
    objekts: ValidObjekt[];
    index: number;
  }) => React.ReactElement;
}) {
  return (
    <div
      className="grid grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))] gap-3 lg:gap-4 pb-4"
      style={{ "--grid-columns": columns } as CSSProperties}
    >
      {objekts.map((objekts, j) => {
        const index = rowIndex * columns + j;
        return children({
          objekts,
          index,
        });
      })}
    </div>
  );
}
