"use client";

import { useFilters } from "@/hooks/use-filters";
import { TextField } from "../ui";

export default function FilterSearch() {
  const [filters, setFilters] = useFilters();
  function update(value: string) {
    setFilters({
      search: value === "" ? null : value,
    });
  }

  return (
    <div>
      <TextField
        placeholder={`Search (eg: naky 305, jw e304)`}
        onChange={(value) => update(value)}
        className="min-w-56"
        value={filters.search ?? ""}
        aria-label="Search"
      />
    </div>
  );
}
