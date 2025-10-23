import { useCallback } from "react";
import type { Selection } from "react-aria-components";
import { useFilterData } from "@/hooks/use-filter-data";
import { useFilters } from "@/hooks/use-filters";
import type { ValidClass } from "@/lib/universal/cosmo/common";
import { Button } from "../ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../ui/menu";

type Props = {
  hideEtc?: boolean;
};

export default function ClassFilter({ hideEtc = false }: Props) {
  const { classes } = useFilterData();
  const [filters, setFilters] = useFilters();
  const selected = new Set(filters.class);

  const update = useCallback(
    (key: Selection) => {
      const values = Array.from((key as Set<ValidClass>).values());
      setFilters({
        class: values.length ? values : null,
      });
    },
    [setFilters],
  );

  const availableClasses = classes.filter((s) =>
    hideEtc ? ["Zero", "Welcome"].includes(s) === false : true,
  );

  return (
    <Menu>
      <Button intent="outline" className={filters.class?.length ? "!inset-ring-primary" : ""}>
        Class
      </Button>
      <MenuContent selectionMode="multiple" selectedKeys={selected} onSelectionChange={update}>
        {availableClasses.map((item) => (
          <MenuItem key={item} id={item} textValue={item}>
            <MenuLabel>{item}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
