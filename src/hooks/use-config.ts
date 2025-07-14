"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ConfigState = {
  hideLabel: boolean;
  setHideLabel: (value: boolean) => void;
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      hideLabel: false,
      setHideLabel: (value: boolean) =>
        set({
          hideLabel: value,
        }),
    }),
    {
      name: "config",
    },
  ),
);
