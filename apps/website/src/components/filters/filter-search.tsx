import { QuestionMarkIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState } from "react";
import { useIntlayer } from "react-intlayer";
import { useDebounceCallback } from "usehooks-ts";

import { useFilters } from "@/hooks/use-filters";

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
  const content = useIntlayer("filter");
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
      aria-label="Search"
    >
      <InputGroup>
        <Input ref={ref} placeholder={content.quick_search.value} />
        {query.length > 0 ? (
          <Button intent="plain" size="sq-xs" onPress={() => handleChange("")}>
            <XIcon data-slot="icon" />
          </Button>
        ) : (
          <Popover>
            <Button aria-label="Info" intent="plain" size="sq-xs">
              <QuestionMarkIcon data-slot="icon" />
            </Button>
            <PopoverContent className="max-w-sm">
              <div className="flex flex-col gap-2 p-6 text-sm">
                <span>{content.search_help.intro.value}</span>
                <ul className="list-inside list-disc leading-6">
                  <li>{content.search_help.or_operation.value}</li>
                  <li>{content.search_help.and_operation.value}</li>
                  <li>{content.search_help.not_operation.value}</li>
                  <li>{content.search_help.artist_names.value}</li>
                  <li>{content.search_help.member_short_names.value}</li>
                  <li>{content.search_help.class.value}</li>
                  <li>{content.search_help.season.value}</li>
                  <li>{content.search_help.collection_numbers.value}</li>
                  <li>{content.search_help.collection_ranges.value}</li>
                  <li>{content.search_help.serial_numbers.value}</li>
                  <li>{content.search_help.serial_ranges.value}</li>
                </ul>
                <span>{content.search_help.example.value}</span>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </InputGroup>
    </TextField>
  );
}
