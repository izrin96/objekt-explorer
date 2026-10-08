import { m } from "@/paraglide/messages";

const R = 8;
const CIRCUMFERENCE = 2 * Math.PI * R;

/** A trade's verified share as a small ring; the "n/m" beside it carries the meaning. */
export function ProgressRing({ verified, total }: { verified: number; total: number }) {
  const share = total > 0 ? verified / total : 0;
  return (
    <span className="text-muted-foreground inline-flex shrink-0 items-center gap-1 font-mono text-xs tabular-nums">
      <svg viewBox="0 0 20 20" aria-hidden className="size-5 -rotate-90">
        <circle cx="10" cy="10" r={R} fill="none" strokeWidth="2.5" className="stroke-border" />
        <circle
          cx="10"
          cy="10"
          r={R}
          fill="none"
          strokeWidth="2.5"
          strokeDasharray={`${CIRCUMFERENCE * share} ${CIRCUMFERENCE}`}
          className="stroke-progress"
        />
      </svg>
      <span aria-hidden>
        {verified}/{total}
      </span>
      <span className="sr-only">{m.offer_progress({ verified, total })}</span>
    </span>
  );
}
