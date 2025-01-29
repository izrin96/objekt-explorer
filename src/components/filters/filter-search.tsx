"use client";

import { useFilters } from "@/hooks/use-filters";
import { TextField } from "../ui";
import { useDebounceCallback } from "usehooks-ts";

export default function FilterSearch() {
  const [filters, setFilters] = useFilters();

  const debounced = useDebounceCallback((value: string) => {
    setFilters({
      search: value === "" ? null : value,
    });
  }, 250);

  return (
    <div>
      <TextField
        placeholder={`naky 305, jw e304 (split by comma)`}
        onChange={debounced}
        className="min-w-65"
        defaultValue={filters.search ?? ""}
        aria-label="Search"
      />
    </div>
  );
}
