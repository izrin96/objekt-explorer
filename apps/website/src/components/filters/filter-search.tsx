import { QuestionMarkIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";

import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";
import { Input, InputGroup } from "../intentui/input";
import { Popover, PopoverContent } from "../intentui/popover";
import { TextField } from "../intentui/text-field";

export default function SearchFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <SearchFilterField
      initialValue={filters.search ?? ""}
      onCommit={(value) => setFilters({ search: value === "" ? null : value })}
    />
  );
}

interface SearchFilterFieldProps {
  initialValue: string;
  onCommit: (value: string) => void;
}

function SearchFilterField({ initialValue, onCommit }: SearchFilterFieldProps) {
  const [localQuery, setLocalQuery] = useState(initialValue);
  const ref = useRef<HTMLInputElement>(null!);
  const [query, setQuery] = useState(initialValue);
  const debouncedCommit = useDebounceCallback(onCommit, 80);

  if (initialValue !== localQuery) {
    setLocalQuery(initialValue);
    setQuery(initialValue);
  }

  const handleChange = (value: string) => {
    setQuery(value);
    debouncedCommit(value);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        window.scrollTo({
          top: ref.current.getBoundingClientRect().y + window.scrollY - 150,
          behavior: "instant",
        });
        ref.current.focus({
          preventScroll: true,
        });
        ref.current.select();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <TextField
      onChange={handleChange}
      className="w-full max-w-72 min-w-50"
      value={query}
      aria-label={m.common_search_aria()}
    >
      <InputGroup className="[--input-gutter-end:--spacing(10)] sm:[--input-gutter-end:--spacing(8)]">
        <Input ref={ref} placeholder={m.filter_quick_search()} />
        {query.length > 0 ? (
          <Button intent="plain" size="sq-xs" onPress={() => handleChange("")}>
            <XIcon />
          </Button>
        ) : (
          <Popover>
            <Button aria-label="Info" intent="plain" size="sq-xs">
              <QuestionMarkIcon />
            </Button>
            <PopoverContent className="max-w-sm">
              <div className="flex flex-col gap-2 p-6 text-sm">
                <span>{m.filter_search_help_intro()}</span>
                <ul className="list-inside list-disc leading-6">
                  <li>{m.filter_search_help_or_operation()}</li>
                  <li>{m.filter_search_help_and_operation()}</li>
                  <li>{m.filter_search_help_not_operation()}</li>
                  <li>{m.filter_search_help_artist_names()}</li>
                  <li>{m.filter_search_help_member_short_names()}</li>
                  <li>{m.filter_search_help_class()}</li>
                  <li>{m.filter_search_help_season()}</li>
                  <li>{m.filter_search_help_collection_numbers()}</li>
                  <li>{m.filter_search_help_collection_ranges()}</li>
                  <li>{m.filter_search_help_serial_numbers()}</li>
                  <li>{m.filter_search_help_serial_ranges()}</li>
                </ul>
                <span>{m.filter_search_help_example()}</span>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </InputGroup>
    </TextField>
  );
}
