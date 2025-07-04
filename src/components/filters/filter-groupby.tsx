"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import type { Selection } from "react-aria-components";
import { useFilters } from "@/hooks/use-filters";
import { type ValidGroupBy, validGroupBy } from "@/lib/universal/cosmo/common";
import { parseSelected } from "@/lib/utils";
import { Button, Menu } from "../ui";

export default function GroupByFilter() {
  const t = useTranslations("filter.group_by");
  const [filters, setFilters] = useFilters();

  const map = useMemo<Record<ValidGroupBy, string>>(
    () => ({
      artist: t("artist"),
      class: t("class"),
      collectionNo: t("collection_no"),
      member: t("member"),
      season: t("season"),
      seasonCollectionNo: t("season_collection_no"),
    }),
    [t],
  );

  const selected = useMemo(
    () => new Set(filters.group_by ? [filters.group_by] : []),
    [filters.group_by],
  );

  const update = useCallback(
    (key: Selection) => {
      const value = parseSelected<ValidGroupBy>(key);
      setFilters({
        group_by: value,
        group_dir: ["member", "class"].includes(value ?? "") ? "asc" : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.group_by ? "!inset-ring-primary" : ""}>
        {t("label")}
      </Button>
      <Menu.Content
        selectionMode="single"
        selectedKeys={selected}
        onSelectionChange={update}
        items={Object.values(validGroupBy).map((value) => ({ value }))}
        className="min-w-52"
      >
        {(item) => (
          <Menu.Item id={item.value} textValue={map[item.value]}>
            <Menu.Label>{map[item.value]}</Menu.Label>
          </Menu.Item>
        )}
      </Menu.Content>
    </Menu>
  );
}
