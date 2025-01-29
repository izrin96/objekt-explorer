"use client";

import type { Selection } from "react-aria-components";
import { ValidSort, validSorts } from "@/lib/universal/cosmo/common";
import { Button, Menu } from "../ui";
import { useMemo } from "react";
import { useFilters } from "@/hooks/use-filters";

type Props = {
  isOwned?: boolean;
};

const map: Record<ValidSort, string> = {
  newest: "Newest",
  oldest: "Oldest",
  newestSeason: "Newest Season",
  oldestSeason: "Oldest Season",
  noDescending: "Highest Collection No.",
  noAscending: "Lowest Collection No.",
  serialDesc: "Highest Serial",
  serialAsc: "Lowest Serial",
  duplicateDesc: "Highest Duplicate",
  duplicateAsc: "Lowest Duplicate",
  memberDesc: "Highest Member Order",
  memberAsc: "Lowest Member Order",
};

const mapDesc: Record<ValidSort, string> = {
  newest: "Sort by date (desc)",
  oldest: "Sort by date (asc)",
  newestSeason: "Sort by Season (desc) and Collection No. (desc)",
  oldestSeason: "Sort by Season (asc) and Collection No. (asc)",
  noDescending: "Sort by Collection No. (desc)",
  noAscending: "Sort by Collection No. (asc)",
  serialDesc: "Sort by Serial (desc)",
  serialAsc: "Sort by Serial (asc)",
  duplicateDesc: "Sort by duplicate count (desc)",
  duplicateAsc: "Sort by duplicate count (asc)",
  memberDesc: "Sort by Member order (desc)",
  memberAsc: "Sort by Member order (asc)",
};

export default function SortFilter({ isOwned = false }: Props) {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(
    () => new Set(filters.sort ? [filters.sort] : ["newest"]),
    [filters.sort]
  );

  function update(key: Selection) {
    const newFilters = [...key] as string[];
    const newValue =
      newFilters.length > 0 ? (newFilters[0] as ValidSort) : "newest";

    setFilters((current) => ({
      sort: newValue === "newest" ? null : newValue,
      grouped: newValue.startsWith("duplicate")
        ? true
        : newValue.startsWith("serial")
        ? false
        : current.grouped,
    }));
  }

  const availableSorts = validSorts.filter((s) =>
    isOwned ? true : !(s.startsWith("serial") || s.startsWith("duplicate"))
  );

  return (
    <Menu>
      <Button appearance="outline">{map[filters.sort ?? "newest"]}</Button>
      <Menu.Content
        selectionMode="single"
        selectedKeys={selected}
        onSelectionChange={update}
        items={availableSorts.map((value) => ({ value }))}
        className="min-w-52"
      >
        {(item) => (
          <Menu.Item id={item.value} textValue={map[item.value]}>
            <Menu.ItemDetails
              label={map[item.value]}
              description={mapDesc[item.value]}
            />
          </Menu.Item>
        )}
      </Menu.Content>
    </Menu>
  );
}
