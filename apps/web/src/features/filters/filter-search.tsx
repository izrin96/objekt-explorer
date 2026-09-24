import { MagnifyingGlassIcon, QuestionMarkIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverPopup, PopoverTrigger } from "@/components/ui/popover";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { m } from "@/paraglide/messages";

import { useFilters, useSetFilters } from "./use-filters";

const HELP_LINES = [
  m.filter_search_help_or_operation,
  m.filter_search_help_and_operation,
  m.filter_search_help_not_operation,
  m.filter_search_help_artist_names,
  m.filter_search_help_member_short_names,
  m.filter_search_help_class,
  m.filter_search_help_season,
  m.filter_search_help_collection_numbers,
  m.filter_search_help_collection_ranges,
  m.filter_search_help_serial_numbers,
  m.filter_search_help_serial_ranges,
];

function SearchHelp() {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={m.filter_search_info_aria()}
            className="absolute top-1/2 right-1 -translate-y-1/2"
          />
        }
      >
        <QuestionMarkIcon />
      </PopoverTrigger>
      <PopoverPopup align="start" className="max-w-sm text-sm">
        <div className="flex flex-col gap-2">
          <span>{m.filter_search_help_intro()}</span>
          <ul className="list-inside list-disc leading-6">
            {HELP_LINES.map((line) => {
              const text = line();
              return <li key={text}>{text}</li>;
            })}
          </ul>
          <span>{m.filter_search_help_example()}</span>
        </div>
      </PopoverPopup>
    </Popover>
  );
}

/**
 * The field holds its own text and commits on a debounce: every commit is a
 * navigation that re-filters the whole catalogue.
 *
 * `className` lands on the kit `Input`'s bordered wrapper, not on the
 * `<input>`, which keeps its own 9px — so `pl-6!` puts the placeholder 8px past
 * the glyph where `pl-8!` lands 16px past it.
 */
export function FilterSearchField() {
  const search = useFilters((f) => f.search);
  const setFilters = useSetFilters();
  const [draft, setDraft] = useState(search ?? "");
  const [committed, setCommitted] = useState(search);
  const ref = useRef<HTMLInputElement>(null);

  // a Reset or a pasted link changes the committed value under the field
  if (search !== committed) {
    setCommitted(search);
    setDraft(search ?? "");
  }

  const commit = useDebouncedCallback(
    (value: string) => setFilters({ search: value.length > 0 ? value : undefined }),
    250,
  );

  // the browser's own find is the wrong tool on a virtualised grid: it can only
  // reach the rows that happen to be mounted
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "f" || !(event.metaKey || event.ctrlKey)) return;
      const input = ref.current;
      if (!input) return;
      event.preventDefault();
      input.scrollIntoView({ block: "center", behavior: "instant" });
      input.focus({ preventScroll: true });
      input.select();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="relative min-w-55 flex-1 md:flex-none">
      {/* z-10 like the kit's own `startAddon`: the Input's wrapper is
          `relative bg-background`, so in light mode it paints over an icon
          that comes before it — dark only escapes it by being translucent */}
      <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 -translate-y-1/2" />
      <Input
        ref={ref}
        size="sm"
        type="search"
        aria-label={m.common_search_aria()}
        placeholder={m.filter_quick_search()}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          commit(event.target.value);
        }}
        className="pr-8! pl-6!"
      />
      {draft.length === 0 ? (
        <SearchHelp />
      ) : (
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={m.filter_search_clear_aria()}
          className="absolute top-1/2 right-1 -translate-y-1/2"
          onClick={() => {
            setDraft("");
            commit("");
            ref.current?.focus();
          }}
        >
          <XIcon />
        </Button>
      )}
    </div>
  );
}
