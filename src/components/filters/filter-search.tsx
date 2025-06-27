"use client";

import { useFilters } from "@/hooks/use-filters";
import { Button, Popover, TextField } from "../ui";
import { useDebounceValue } from "usehooks-ts";
import { useEffect, useState } from "react";
import { QuestionMarkIcon, XIcon } from "@phosphor-icons/react/dist/ssr";

export default function SearchFilter() {
  const [filters, setFilters] = useFilters();
  const [query, setQuery] = useState(filters.search ?? "");

  const [debounced] = useDebounceValue(query, 250);

  useEffect(() => {
    setFilters({ search: debounced === "" ? null : debounced });
  }, [debounced, setFilters]);

  useEffect(() => {
    // clear the text if reset
    if (!filters.search) {
      setQuery("");
    }
  }, [filters.search]);

  return (
    <TextField
      placeholder={`Quick search..`}
      onChange={setQuery}
      className="max-w-72 min-w-50 w-full"
      value={query}
      aria-label="Search"
      suffix={
        query.length > 0 ? (
          <Button intent="plain" onPress={() => setQuery("")}>
            <XIcon data-slot="icon" />
          </Button>
        ) : (
          <Popover>
            <Button intent="plain">
              <QuestionMarkIcon data-slot="icon" />
            </Button>
            <Popover.Content className="prose p-4 max-w-sm">
              <span>This quick search supports:</span>
              <ul>
                <li>OR query operation by comma</li>
                <li>AND query operation by space</li>
                <li>
                  NOT query operation by starting with an exclamation mark
                  (example: !seoyeon, !d201-202)
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
              <span>
                Example: yy c201-204 !c202 #1-200, jw 201z, yb sco divine
              </span>
            </Popover.Content>
          </Popover>
        )
      }
    />
  );
}
