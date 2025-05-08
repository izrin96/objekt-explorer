"use client";

import { useFilters } from "@/hooks/use-filters";
import { Button, Popover, TextField } from "../ui";
import { useDebounceValue } from "usehooks-ts";
import { IconCircleQuestionmark, IconX } from "@intentui/icons";
import { useEffect, useState } from "react";

export default function SearchFilter() {
  const [filters, setFilters] = useFilters();
  const [query, setQuery] = useState(filters.search);

  const [debounced] = useDebounceValue(query, 250);

  useEffect(() => {
    setFilters({ search: debounced === "" ? null : debounced });
  }, [debounced, setFilters]);

  return (
    <div>
      <TextField
        placeholder={`Quick search..`}
        onChange={setQuery}
        className="max-w-65 min-w-40"
        value={query}
        aria-label="Search"
        suffix={
          query.length > 0 ? (
            <Button intent="plain" onPress={() => setQuery("")}>
              <IconX />
            </Button>
          ) : (
            <Popover>
              <Button intent="plain">
                <IconCircleQuestionmark />
              </Button>
              <Popover.Content className="sm:max-w-96">
                <Popover.Header>
                  <Popover.Title hidden>Info</Popover.Title>
                  <Popover.Description className="prose text-fg">
                    <p>This quick search supports:</p>
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
                    <p>Grouping query using brackets is not supported</p>
                    <p>
                      Example: yy c201-204 !c202 #1-200, jw 201z, yb special
                      divine
                    </p>
                  </Popover.Description>
                </Popover.Header>
              </Popover.Content>
            </Popover>
          )
        }
      />
    </div>
  );
}
