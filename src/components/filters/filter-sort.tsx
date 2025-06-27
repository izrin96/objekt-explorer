"use client";

import type { Selection } from "react-aria-components";
import { ValidSort, validSorts } from "@/lib/universal/cosmo/common";
import { Button, Menu } from "../ui";
import { useMemo } from "react";
import { useFilters } from "@/hooks/use-filters";
import { parseSelected } from "@/lib/utils";

type Props = {
  allowDuplicateSort?: boolean;
  allowSerialSort?: boolean;
};

const map: Record<ValidSort, string> = {
  date: "Date",
  season: "Season",
  collectionNo: "Collection No.",
  serial: "Serial",
  duplicate: "Duplicate",
  member: "Member Order",
};

const mapDesc: Record<ValidSort, string> = {
  date: "Sort by date",
  season: "Sort by Season and Collection No.",
  collectionNo: "Sort by Collection No.",
  serial: "Sort by Serial",
  duplicate: "Sort by duplicate count",
  member: "Sort by Member order",
};

export default function SortFilter({
  allowDuplicateSort = false,
  allowSerialSort = false,
}: Props) {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(
    () => new Set(filters.sort ? [filters.sort] : ["date"]),
    [filters.sort]
  );

  function update(key: Selection) {
    const value = parseSelected<ValidSort>(key) ?? "date";

    setFilters((current) => ({
      sort: value === "date" ? null : value,
      sort_dir: ["serial", "member"].includes(value) ? "asc" : null,
      grouped:
        value === "duplicate"
          ? true
          : value === "serial"
          ? false
          : current.grouped,
    }));
  }

  const availableSorts = validSorts.filter((s) => {
    if (s === "duplicate" && !allowDuplicateSort) return false;
    if (s === "serial" && !allowSerialSort) return false;
    return true;
  });

  return (
    <Menu>
      <Button
        intent="outline"
        className={filters.sort ? "!inset-ring-primary" : ""}
      >
        Sort by
      </Button>
      <Menu.Content
        selectionMode="single"
        selectedKeys={selected}
        onSelectionChange={update}
        items={availableSorts.map((value) => ({ value }))}
        className="min-w-52"
      >
        {(item) => (
          <Menu.Item id={item.value} textValue={map[item.value]}>
            <Menu.Label>{map[item.value]}</Menu.Label>
            <Menu.Description>{mapDesc[item.value]}</Menu.Description>
          </Menu.Item>
        )}
      </Menu.Content>
    </Menu>
  );
}
