import { create } from "zustand";
import { persist } from "zustand/middleware";

export const validThemeStyle = [
  "default",
  "catppuccin",
  "matsu",
  "bubblegum",
  "caffeine",
  "amethyst-haze",
  "tangerine",
  "mocha-mousse",
  "sunset-horizon",
  "cosmic-night",
] as const;
export type ValidThemeStyle = (typeof validThemeStyle)[number];

interface ThemeStyleStore {
  themeStyle: ValidThemeStyle;
  setThemeStyle: (style: ValidThemeStyle) => void;
}

export const useThemeStyle = create<ThemeStyleStore>()(
  persist(
    (set) => ({
      themeStyle: "default",
      setThemeStyle: (style) => {
        set({
          themeStyle: style,
        });
      },
    }),
    {
      name: "theme-style",
    },
  ),
);
