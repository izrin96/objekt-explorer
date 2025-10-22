import { QuestionMarkIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useRef, useState } from "react";
import { useDebounceCallback } from "usehooks-ts";
import { useFilters } from "@/hooks/use-filters";
import { Button } from "../ui/button";
import { FieldGroup, Input } from "../ui/field";
import { Popover, PopoverContent } from "../ui/popover";
import { TextField } from "../ui/text-field";

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
  const debouncedCommit = useDebounceCallback(onCommit, 250);

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
      className="w-full min-w-50 max-w-72"
      value={query}
      aria-label="Search"
    >
      <FieldGroup>
        <Input ref={ref} placeholder="Quick search.." />
        {query.length > 0 ? (
          <Button intent="plain" size="sq-xs" onClick={() => handleChange("")}>
            <XIcon data-slot="icon" />
          </Button>
        ) : (
          <Popover>
            <Button aria-label="Info" intent="plain" size="sq-xs">
              <QuestionMarkIcon data-slot="icon" />
            </Button>
            <PopoverContent className="max-w-sm overflow-auto p-4">
              <span>This quick search supports:</span>
              <ul className="list-disc">
                <li>OR query operation by comma</li>
                <li>AND query operation by space</li>
                <li>
                  NOT query operation by starting with an exclamation mark (example: !seoyeon,
                  !d201-202)
                </li>
                <li>Artist names (example: triples)</li>
                <li>Member short names (example: naky, yy)</li>
                <li>Class (example: special, sco)</li>
                <li>Season (example: atom)</li>
                <li>Collection numbers (example: d207)</li>
                <li>Collection number ranges (example: 301z-302z)</li>
                <li>Serial numbers (example: #1)</li>
                <li>Serial number ranges (example: #1-20)</li>
              </ul>
              <span>Example: yy c201-204 !c202 #1-200, jw 201z, yb sco divine</span>
            </PopoverContent>
          </Popover>
        )}
      </FieldGroup>
    </TextField>
  );
}
