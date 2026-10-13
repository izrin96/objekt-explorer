import { LISTED_WINDOW_LABEL } from "@/features/filters/labels";
import { LISTED_WINDOWS, type ListedWindow } from "@/features/filters/listed-window";
import { SingleSelect } from "@/features/filters/single-select";
import { useFilters, useSetFilters } from "@/features/filters/use-filters";
import { m } from "@/paraglide/messages";

/** `any` is the absence of `listed`, spelled as a value the select can hold */
const ANY_TIME = "any" as const;

export function ListedFilter({ className }: { className?: string }) {
  const listed = useFilters((f) => f.listed);
  const setFilters = useSetFilters();
  // built per render: a message read at module scope mismatches on hydration
  const options: { value: ListedWindow | typeof ANY_TIME; label: string }[] = [
    { value: ANY_TIME, label: m.filter_listed_any() },
    ...LISTED_WINDOWS.map((value) => ({ value, label: LISTED_WINDOW_LABEL[value]() })),
  ];

  return (
    <SingleSelect
      label={m.filter_listed()}
      options={options}
      value={listed ?? ANY_TIME}
      defaultValue={ANY_TIME}
      onChange={(value) => setFilters({ listed: value === ANY_TIME ? undefined : value })}
      className={className}
    />
  );
}
