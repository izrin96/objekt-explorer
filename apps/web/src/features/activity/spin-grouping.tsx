import { StackSimpleIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";

import { FilterToggle } from "@/features/filters/filter-toggle";
import { m } from "@/paraglide/messages";

import { type SpinsSearch, useSpinsGrouped } from "./spins-search";

export function SpinGroupToggle({ className }: { className?: string }) {
  const grouped = useSpinsGrouped();
  const navigate = useNavigate();
  return (
    <FilterToggle
      label={m.spin_group_toggle()}
      icon={<StackSimpleIcon />}
      pressed={grouped}
      onPressedChange={(pressed) =>
        void navigate({
          to: ".",
          replace: true,
          resetScroll: false,
          search: (prev: SpinsSearch): SpinsSearch => ({
            ...prev,
            spins: pressed ? undefined : "raw",
          }),
        })
      }
      className={className}
    />
  );
}
