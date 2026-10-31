import { Fragment } from "react";

import { cn } from "@/lib/utils";
import { getLocale } from "@/paraglide/runtime";

/** stands where a message puts a number, so each number can be styled whatever its position */
const mark = (index: number) => `${index}`;
const MARKS = /(\d+)/;

/**
 * A message with its numbers set apart in monospace; the words stay the accessible text.
 * `numbers` are by placeholder name (`{ give, get }`), and `render` gets a mark for each.
 */
export function WithNumbers<K extends string>({
  numbers,
  render,
  className,
}: {
  numbers: Record<K, number>;
  render: (marks: Record<K, string>) => string;
  className?: string;
}) {
  const entries = Object.entries(numbers) as [K, number][];
  const marks = Object.fromEntries(entries.map(([name], index) => [name, mark(index)]));
  const parts = render(marks as Record<K, string>).split(MARKS);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 0 ? (
          <Fragment key={index}>{part}</Fragment>
        ) : (
          <b key={index} className={cn("font-semibold tabular-nums", className)}>
            {entries[Number(part)]?.[1]?.toLocaleString(getLocale())}
          </b>
        ),
      )}
    </>
  );
}

/** One number, as `WithNumbers` sets it. */
export function WithNumber({
  render,
  count,
  className,
}: {
  render: (count: string) => string;
  count: number;
  className?: string;
}) {
  return (
    <WithNumbers
      numbers={{ count }}
      render={(marks) => render(marks.count)}
      className={className}
    />
  );
}
