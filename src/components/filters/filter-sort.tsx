"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { Selection } from "react-aria-components";
import { useFilters } from "@/hooks/use-filters";
import { type ValidSort, validSorts } from "@/lib/universal/cosmo/common";
import { parseSelected } from "@/lib/utils";
import { Button, Menu } from "../ui";

type Props = {
  allowDuplicateSort?: boolean;
  allowSerialSort?: boolean;
};

export default function SortFilter({ allowDuplicateSort = false, allowSerialSort = false }: Props) {
  const t = useTranslations("filter.sort_by");
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.sort ? [filters.sort] : ["date"]), [filters.sort]);

  const map = useMemo<Record<ValidSort, { label: string; desc: string }>>(
    () => ({
      date: { label: t("date.label"), desc: t("date.desc") },
      season: { label: t("season.label"), desc: t("season.desc") },
      collectionNo: { label: t("collection_no.label"), desc: t("collection_no.desc") },
      serial: { label: t("serial.label"), desc: t("serial.desc") },
      duplicate: { label: t("dups.label"), desc: t("dups.desc") },
      member: { label: t("member.label"), desc: t("member.desc") },
    }),
    [t],
  );

  function update(key: Selection) {
    const value = parseSelected<ValidSort>(key) ?? "date";

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
      <Menu.Content
        selectionMode="single"
        selectedKeys={selected}
        onSelectionChange={update}
        items={availableSorts.map((value) => ({ value }))}
        className="min-w-52"
      >
        {(item) => {
          const i = map[item.value];
          return (
            <Menu.Item id={item.value} textValue={i.label}>
              <Menu.Label>{i.label}</Menu.Label>
              <Menu.Description>{i.desc}</Menu.Description>
            </Menu.Item>
          );
        }}
      </Menu.Content>
    </Menu>
  );
}
