import { EyeIcon, ListBulletsIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";

import { MenuItem, MenuSeparator } from "@/components/ui/menu";
import { formatCount } from "@/lib/number";
import { m } from "@/paraglide/messages";

/**
 * A rule's menu items: See objekts (Hide objekts while `expanded`), Edit rule, Turn into objekts,
 * then Delete. The caller brings the `Menu`, its trigger and its popup.
 */
export function RuleMenuItems({
  covers,
  expanded = false,
  onSeeObjekts,
  onEdit,
  onConfirm,
}: {
  covers: number;
  expanded?: boolean;
  onSeeObjekts: () => void;
  onEdit: () => void;
  onConfirm: (action: "delete" | "detach") => void;
}) {
  return (
    <>
      <MenuItem onClick={onSeeObjekts}>
        <EyeIcon />
        {expanded
          ? m.rule_hide_objekts()
          : covers === 1
            ? m.rule_see_objekts_one()
            : m.rule_see_objekts({ count: formatCount(covers) })}
      </MenuItem>
      <MenuItem onClick={onEdit}>
        <PencilSimpleIcon />
        {m.rule_edit()}
      </MenuItem>
      <MenuItem onClick={() => onConfirm("detach")}>
        <ListBulletsIcon />
        {m.rule_detach()}
      </MenuItem>
      <MenuSeparator />
      <MenuItem variant="destructive" onClick={() => onConfirm("delete")}>
        <TrashIcon />
        {m.rule_delete()}
      </MenuItem>
    </>
  );
}
