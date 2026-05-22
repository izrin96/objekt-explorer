import { CurrencyDollarIcon } from "@phosphor-icons/react/dist/ssr";

import { MenuItem, MenuLabel } from "@/components/intentui/menu";
import { m } from "@/paraglide/messages";

export function SetPriceMenuItem({ onAction }: { onAction: () => void }) {
  return (
    <MenuItem onAction={onAction}>
      <CurrencyDollarIcon />
      <MenuLabel>{m.objekt_menu_set_price()}</MenuLabel>
    </MenuItem>
  );
}
