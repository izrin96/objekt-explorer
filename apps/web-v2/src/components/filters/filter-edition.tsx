import { useCallback } from "react";
import type { Selection } from "react-aria-components";
import { useFilters } from "@/hooks/use-filters";
import { type ValidEdition, validEdition } from "@/lib/universal/cosmo/common";
import { Button } from "../ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../ui/menu";

export default function EditionFilter() {
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.edition);

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<ValidEdition>).values());
      setFilters({
        edition: values.length ? values : null,
      });
    },
    [setFilters],
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.edition?.length ? "!inset-ring-primary" : ""}>
        Edition
      </Button>
      <MenuContent selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {validEdition.map((item) => (
          <MenuItem key={item} id={item} textValue={item}>
            <MenuLabel>{item}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
