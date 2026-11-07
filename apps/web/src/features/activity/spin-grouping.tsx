import { StackSimpleIcon } from "@phosphor-icons/react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import * as z from "zod";

import { FilterToggle } from "@/features/filters/filter-toggle";
import { m } from "@/paraglide/messages";

/** `raw` lists spins and their rewards as plain transfers; grouped is the absence of the key. */
export const spinsSearchSchema = z.enum(["raw"]).optional().catch(undefined);

type SpinsSearch = { spins?: z.infer<typeof spinsSearchSchema> };

export function useSpinsGrouped(): boolean {
  return useSearch({
    strict: false,
    select: (search) => (search as SpinsSearch).spins !== "raw",
  });
}

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
