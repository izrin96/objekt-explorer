"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo } from "react";
import type { Selection } from "react-aria-components";
import { useFilters } from "@/hooks/use-filters";
import { type ValidEdition, validEdition } from "@/lib/universal/cosmo/common";
import { parseSelected } from "@/lib/utils";
import { Button, Menu } from "../ui";

export default function EditionFilter() {
  const t = useTranslations("filter");
  const [filters, setFilters] = useFilters();
  const selected = useMemo(() => new Set(filters.edition), [filters.edition]);

  const update = useCallback(
    (key: Selection) => {
      const value = parseSelected<ValidEdition>(key, true);
      setFilters({
        edition: value,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.edition?.length ? "!inset-ring-primary" : ""}>
        {t("edition")}
      </Button>
      <Menu.Content selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {validEdition.map((item) => (
          <Menu.Item key={item} id={item} textValue={item}>
            <Menu.Label>{item}</Menu.Label>
          </Menu.Item>
        ))}
      </Menu.Content>
    </Menu>
  );
}
