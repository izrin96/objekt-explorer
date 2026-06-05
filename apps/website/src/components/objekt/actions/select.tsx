import { CheckIcon } from "@phosphor-icons/react/dist/ssr";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { MenuItem, MenuLabel } from "@/components/intentui/menu";
import { useObjektSelect } from "@/hooks/use-objekt-select";
import { m } from "@/paraglide/messages";

export function SelectMenuItem({ objekts }: { objekts: ValidObjekt[] }) {
  const [objekt] = objekts as [ValidObjekt];
  const objektSelect = useObjektSelect((a) => a.select);
  const isSelected = useObjektSelect((state) => state.isSelected(objekt));
  return (
    <MenuItem onAction={() => objektSelect(objekts)}>
      <CheckIcon />
      <MenuLabel>{isSelected ? m.objekt_menu_unselect() : m.objekt_menu_select()}</MenuLabel>
    </MenuItem>
  );
}
