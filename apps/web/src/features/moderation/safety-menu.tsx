import { DotsThreeIcon, FlagIcon, ProhibitIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { useCurrentUser } from "@/features/user/hooks";
import { m } from "@/paraglide/messages";

import { useSafetyDialogs } from "./safety-dialogs";

/**
 * Block, and Report… where the surface allows it, for another signed-in account. Renders
 * nothing signed out or for the viewer's own account.
 */
export function SafetyMenu({
  userId,
  name,
  report = false,
  extraItems,
  className,
}: {
  userId: string;
  name: string;
  report?: boolean;
  /** the surface's own items, above Block */
  extraItems?: ReactNode;
  className?: string;
}) {
  const { data: current } = useCurrentUser();
  if (!current || current.user.id === userId) return null;
  return (
    <SafetyMenuInner
      userId={userId}
      name={name}
      report={report}
      extraItems={extraItems}
      className={className}
    />
  );
}

function SafetyMenuInner({
  userId,
  name,
  report,
  extraItems,
  className,
}: {
  userId: string;
  name: string;
  report: boolean;
  extraItems: ReactNode;
  className?: string;
}) {
  const safety = useSafetyDialogs({ userId, name });

  return (
    <>
      <Menu>
        <MenuTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={m.mod_more_actions({ name })}
              className={className}
            />
          }
        >
          <DotsThreeIcon weight="bold" />
        </MenuTrigger>
        <MenuPopup align="end" className="min-w-44">
          {extraItems}
          <MenuItem variant="destructive" onClick={safety.openBlock}>
            <ProhibitIcon />
            {m.mod_block()}
          </MenuItem>
          {report ? (
            <MenuItem onClick={safety.openReport}>
              <FlagIcon />
              {m.mod_report()}
            </MenuItem>
          ) : null}
        </MenuPopup>
      </Menu>
      {safety.dialogs}
    </>
  );
}
