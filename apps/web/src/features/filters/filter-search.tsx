import { MagnifyingGlassIcon, QuestionMarkIcon, XIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
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
        render={<Button variant="ghost" size="icon-xs" aria-label={m.filter_search_info_aria()} />}
      >
        <QuestionMarkIcon />
      </PopoverTrigger>
      <PopoverPopup align="start" className="max-w-sm text-sm">
        <div className="flex flex-col gap-2">
          <span>{m.filter_search_help_intro()}</span>
          <ul className="list-outside list-disc space-y-1 ps-4 leading-5">
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
    <InputGroup className="min-w-55 flex-1 md:w-55 md:flex-none">
      <InputGroupInput
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
      />
      <InputGroupAddon>
        <MagnifyingGlassIcon />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        {draft.length === 0 ? (
          <SearchHelp />
        ) : (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={m.filter_search_clear_aria()}
            onClick={() => {
              setDraft("");
              commit("");
              ref.current?.focus();
            }}
          >
            <XIcon />
          </Button>
        )}
      </InputGroupAddon>
    </InputGroup>
  );
}

/** The same grammar for a picker in a dialog, whose filters live in its own state, not the URL. */
export function PickerSearchField({ onCommit }: { onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const commit = useDebouncedCallback(onCommit, 250);

  return (
    <InputGroup className="min-w-48 flex-1">
      <InputGroupInput
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
      />
      <InputGroupAddon>
        <MagnifyingGlassIcon />
      </InputGroupAddon>
      <InputGroupAddon align="inline-end">
        {draft.length === 0 ? (
          <SearchHelp />
        ) : (
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={m.filter_search_clear_aria()}
            onClick={() => {
              setDraft("");
              commit("");
              ref.current?.focus();
            }}
          >
            <XIcon />
          </Button>
        )}
      </InputGroupAddon>
    </InputGroup>
  );
}
