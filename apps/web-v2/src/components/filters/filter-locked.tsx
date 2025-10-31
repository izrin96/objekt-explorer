import { useFilters } from "@/hooks/use-filters";
import { Button } from "../ui/button";

export default function LockedFilter() {
  const [filters, setFilters] = useFilters();
  return (
    <Button
      intent="outline"
      data-selected={filters.locked}
      className="w-fit"
      onClick={() =>
        setFilters((f) => ({
          locked: f.locked === true ? false : f.locked === false ? null : true,
        }))
      }
    >
      {filters.locked === true
        ? "Only locked"
        : filters.locked === false
          ? "Only unlocked"
          : "Lock/unlocked"}
    </Button>
  );
}
