import { sparklinePath } from "./sparkline-path";

const WIDTH = 120;

const HEIGHT = 24;

/** Decorative: the change beside it carries the meaning. */
export function PriceSparkline({ values }: { values: (number | null)[] }) {
  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden
      className="h-6 w-30 min-w-0 overflow-visible"
    >
      <path
        d={sparklinePath(values, WIDTH, HEIGHT)}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
