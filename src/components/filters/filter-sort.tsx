"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("filter.sort_by");
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.sort ? [filters.sort] : ["date"]);

  const map = {
    date: { label: t("date.label"), desc: t("date.desc") },
    season: { label: t("season.label"), desc: t("season.desc") },
    collectionNo: { label: t("collection_no.label"), desc: t("collection_no.desc") },
    serial: { label: t("serial.label"), desc: t("serial.desc") },
    duplicate: { label: t("dups.label"), desc: t("dups.desc") },
    member: { label: t("member.label"), desc: t("member.desc") },
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
      <Button intent="outline" className={filters.sort ? "!inset-ring-primary" : ""}>
        {t("label")}
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
