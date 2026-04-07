import { useConfigStore } from "./use-config";

export function useWide() {
  const wide = useConfigStore((a) => a.wide);
  const setWide = useConfigStore((a) => a.setWide);

  return {
    wide,
    setWide,
  };
}
