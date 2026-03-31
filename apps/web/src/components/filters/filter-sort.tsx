"use client";

import type { ValidCustomSort } from "@repo/cosmo/types/common";
import { useTranslations } from "next-intl";
import type { Selection } from "react-aria-components";

import { useFilters } from "@/hooks/use-filters";

import { Button } from "../ui/button";
import { Menu, MenuContent, MenuDescription, MenuItem, MenuLabel } from "../ui/menu";

const defaultSorts: ValidCustomSort[] = ["date", "season", "collectionNo", "member"];

type Props = {
  enabled?: ValidCustomSort[];
};

export default function SortFilter({ enabled = defaultSorts }: Props) {
  const t = useTranslations("filter.sort_by");
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.sort ? [filters.sort] : ["date"]);

  const map: Record<ValidCustomSort, { label: string; desc: string }> = {
    date: { label: t("date.label"), desc: t("date.desc") },
    season: { label: t("season.label"), desc: t("season.desc") },
    collectionNo: { label: t("collection_no.label"), desc: t("collection_no.desc") },
    serial: { label: t("serial.label"), desc: t("serial.desc") },
    duplicate: { label: t("dups.label"), desc: t("dups.desc") },
    member: { label: t("member.label"), desc: t("member.desc") },
  };

  function update(key: Selection) {
    const value = Array.from((key as Set<ValidCustomSort>).values()).at(0) ?? "date";

    return setFilters((current) => ({
      sort: value === "date" ? null : value,
      sort_dir: ["serial", "member"].includes(value) ? "asc" : null,
      grouped: value === "duplicate" ? true : value === "serial" ? false : current.grouped,
    }));
  }

  return (
    <Menu>
      <Button intent="outline" data-selected={filters.sort}>
        {t("label")}
      </Button>
      <MenuContent
        selectionMode="single"
        selectedKeys={selected}
        onSelectionChange={update}
        className="min-w-52"
      >
        {enabled.map((item) => {
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
