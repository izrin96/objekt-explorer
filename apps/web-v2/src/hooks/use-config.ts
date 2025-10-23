import { create } from "zustand";
import { persist } from "zustand/middleware";

type ConfigState = {
  hideLabel: boolean;
  setHideLabel: (value: boolean) => void;
  wide: boolean;
  setWide: (value: boolean) => void;
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      hideLabel: false,
      setHideLabel: (value: boolean) =>
        set({
          hideLabel: value,
        }),
      wide: false,
      setWide: (value: boolean) => set({ wide: value }),
    }),
    {
      name: "config",
    },
  ),
);
