import { parseAsBoolean, useQueryState } from "nuqs";
import { useCallback } from "react";
import { useConfigStore } from "./use-config";

export function useWideFilter() {
  return useQueryState("wide", parseAsBoolean);
}

export function useWide() {
  const [queryWide, setQueryWide] = useWideFilter();
  const wideStore = useConfigStore((a) => a.wide);
  const setWideStore = useConfigStore((a) => a.setWide);

  const setWide = useCallback(
    (value: boolean) => {
      if (queryWide) {
        setQueryWide(null);
      }
      setWideStore(value);
    },
    [queryWide, setQueryWide, setWideStore],
  );

  return {
    wide: queryWide ?? wideStore,
    setWide,
  };
}
