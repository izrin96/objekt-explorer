"use client";

import type { Selection } from "react-aria-components";
import { ValidSort, validSorts } from "@/lib/universal/cosmo/common";
import { Button, Menu } from "../ui";
import { useMemo } from "react";
import { useFilters } from "@/hooks/use-filters";

type Props = {
  isProfile?: boolean;
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

export default function SortFilter({ isProfile = false }: Props) {
  const [filters, setFilters] = useFilters();
  const selected = useMemo(
    () => new Set(filters.sort ? [filters.sort] : ["date"]),
    [filters.sort]
  );

  function update(key: Selection) {
    const newFilters = [...key] as string[];
    const newValue =
      newFilters.length > 0 ? (newFilters[0] as ValidSort) : "date";

    setFilters((current) => ({
      sort: newValue === "date" ? null : newValue,
      sort_dir: ["serial", "member"].includes(newValue) ? "asc" : null,
      grouped:
        newValue === "duplicate"
          ? true
          : newValue === "serial"
          ? false
          : current.grouped,
    }));
  }

  const availableSorts = validSorts.filter((s) =>
    isProfile ? true : !["serial", "duplicate"].includes(s)
  );

  return (
    <Menu>
      <Button appearance="outline">Sort by</Button>
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
