"use client";

import { useFilters } from "@/hooks/use-filters";
import { Button, Popover, TextField } from "../ui";
import { useDebounceValue } from "usehooks-ts";
import { IconCircleQuestionmark, IconX } from "justd-icons";
import { useEffect, useState } from "react";

export default function FilterSearch() {
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
                      <li>Multiple queries separated by commas ( , )</li>
                      <li>Member names in short form (e.g. naky, yy)</li>
                      <li>Collection No. ranges (e.g. 301z-302z)</li>
                      <li>Serial No. ranges (e.g. #1-20)</li>
                      <li>Artist name (e.g. triples)</li>
                    </ul>
                    <p>Example: yy c301-302 #10-100, jw 201z</p>
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
