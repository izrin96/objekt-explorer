import { create } from "zustand";
import { persist } from "zustand/middleware";

type ConfigState = {
  hideLabel: boolean;
  setHideLabel: (value: boolean) => void;
  wide: boolean;
  setWide: (value: boolean) => void;
  /** ISO 4217 code that Marketplace prices are converted into */
  currency: string;
  setCurrency: (value: string) => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
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
      currency: "USD",
      setCurrency: (value: string) => set({ currency: value }),
      _hasHydrated: false,
      setHasHydrated: (state) => {
        set({
          _hasHydrated: state,
        });
      },
    }),
    {
      name: "config",
      onRehydrateStorage: (state) => {
        return () => state.setHasHydrated(true);
      },
    },
  ),
);
