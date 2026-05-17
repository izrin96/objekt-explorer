import { parseAsStringLiteral, useQueryState } from "nuqs";
import type { Selection } from "react-aria-components";

import { Button } from "@/components/intentui/button";
import { Menu, MenuContent, MenuItem, MenuLabel } from "@/components/intentui/menu";
import { type ValidType, validType } from "@/lib/universal/transfers";
import { m } from "@/paraglide/messages";

export function useTypeFilter() {
  return useQueryState("type", parseAsStringLiteral(validType));
}

export default function TypeFilter() {
  const [type, setType] = useTypeFilter();
  const selected = new Set(type ? [type] : ["all"]);

  const map = {
    all: m.trades_filter_type_all(),
    mint: m.trades_filter_type_mint(),
    received: m.trades_filter_type_received(),
    sent: m.trades_filter_type_sent(),
    spin: m.trades_filter_type_spin(),
  };

  const update = (key: Selection) => {
    const value = Array.from((key as Set<ValidType>).values()).at(0) ?? "all";
    return setType(value === "all" ? null : value);
  };

  return (
    <Menu>
      <Button intent="outline" data-selected={type}>
        {m.trades_filter_type_label()}
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
