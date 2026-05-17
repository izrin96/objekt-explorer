import { useFilters } from "@/hooks/use-filters";
import { m } from "@/paraglide/messages";

import { Button } from "../intentui/button";

export default function LockedFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Button
      intent="outline"
      data-selected={filters.locked}
      className="w-fit"
      onPress={() =>
        setFilters((f) => ({
          locked: f.locked === true ? false : f.locked === false ? null : true,
        }))
      }
    >
      {filters.locked === true
        ? m.filter_only_locked()
        : filters.locked === false
          ? m.filter_only_unlocked()
          : m.filter_lock_unlocked()}
    </Button>
  );
}
