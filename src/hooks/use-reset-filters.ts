import { useFilters } from "./use-filters";

export function useResetFilters() {
  const [, setFilters] = useFilters();
  function reset() {
    setFilters({
      member: null,
      artist: null,
      sort: null,
      class: null,
      season: null,
      on_offline: null,
      transferable: null,
      search: null,
      grouped: null,
      group_by: null,
      group_bys: null,
      sort_dir: null,
      group_dir: null,
      unowned: null,
      edition: null,
      hidePin: null,
      color: null,
    });
  }
  return reset;
}
