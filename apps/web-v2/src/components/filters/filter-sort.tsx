import type { Selection } from "react-aria-components";
import { useFilters } from "@/hooks/use-filters";
import { type ValidSort, validSorts } from "@/lib/universal/cosmo/common";
import { Button } from "../ui/button";
import { Menu, MenuContent, MenuDescription, MenuItem, MenuLabel } from "../ui/menu";

type Props = {
  allowDuplicateSort?: boolean;
  allowSerialSort?: boolean;
};

export default function SortFilter({ allowDuplicateSort = false, allowSerialSort = false }: Props) {
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.sort ? [filters.sort] : ["date"]);

  const map = {
    date: { label: "Sort by", desc: "Sort by date" },
    season: { label: "Season", desc: "Sort by Season and Collection No." },
    collectionNo: { label: "Collection No.", desc: "Sort by Collection No." },
    serial: { label: "Serial", desc: "Sort by Serial" },
    duplicate: { label: "Duplicate", desc: "Sort by duplicate count" },
    member: { label: "Member Order", desc: "Sort by Member order" },
  };

  function update(key: Selection) {
    const value = Array.from((key as Set<ValidSort>).values()).at(0) ?? "date";

    setFilters((current) => ({
      sort: value === "date" ? null : value,
      sort_dir: ["serial", "member"].includes(value) ? "asc" : null,
      grouped: value === "duplicate" ? true : value === "serial" ? false : current.grouped,
    }));
  }

  const availableSorts = validSorts.filter((s) => {
    if (s === "duplicate" && !allowDuplicateSort) return false;
    if (s === "serial" && !allowSerialSort) return false;
    return true;
  });

  return (
    <Menu>
      <Button intent="outline" className={filters.sort ? "inset-ring-primary!" : ""}>
        Sort by
      </Button>
      <MenuContent
        selectionMode="single"
        selectedKeys={selected}
        onSelectionChange={update}
        className="min-w-52"
      >
        {availableSorts.map((item) => {
          const i = map[item];
          return (
            <MenuItem key={item} id={item} textValue={i.label}>
              <MenuLabel>{i.label}</MenuLabel>
              <MenuDescription>{i.desc}</MenuDescription>
            </MenuItem>
          );
        })}
      </MenuContent>
    </Menu>
  );
}
