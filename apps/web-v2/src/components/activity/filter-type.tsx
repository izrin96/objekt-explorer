import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { Selection } from "react-aria-components";
import { type ValidType, validType } from "@/lib/universal/activity";
import { Button } from "../ui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "../ui/menu";

export function useTypeFilter() {
  return useQueryState("type", parseAsStringLiteral(validType));
}

export default function TypeFilter() {
  const [type, setType] = useTypeFilter();
  const selected = new Set(type ? [type] : ["all"]);

  const map = {
    all: "All",
    mint: "Mint",
    transfer: "Transfer",
    spin: "Spin",
  };

  const update = (key: Selection) => {
    const value = Array.from((key as Set<ValidType>).values()).at(0) ?? "all";
    setType(value === "all" ? null : value);
  };

  return (
    <Menu>
      <Button intent="outline" className={type ? "!inset-ring-primary" : ""}>
        Event
      </Button>
      <MenuContent selectionMode="single" selectedKeys={selected} onSelectionChange={update}>
        {validType.map((item) => (
          <MenuItem key={item} id={item} textValue={map[item]}>
            <MenuLabel>{map[item]}</MenuLabel>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}
