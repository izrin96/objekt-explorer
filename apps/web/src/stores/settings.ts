import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const THEMES = ["System", "Light", "Dark"] as const;

export type Theme = (typeof THEMES)[number];

export const SETTINGS_STORAGE_KEY = "web:settings";

type SettingsState = {
  theme: Theme;
  /** drop the container's max width */
  wide: boolean;
  /** hide collection labels on objekt cards */
  hideLabel: boolean;
  set: (patch: Partial<Pick<SettingsState, "theme" | "wide" | "hideLabel">>) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "System",
      wide: false,
      hideLabel: false,
      set: (patch) => set(patch),
    }),
    { name: SETTINGS_STORAGE_KEY },
  ),
);

/** `app.css` declares `@custom-variant dark (&:is(.dark *))`, so the theme is one class */
function applyTheme(theme: Theme): void {
  const dark =
    theme === "Dark" ||
    (theme === "System" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/**
 * Mirrors `theme` and `wide` onto `<html>`. The root document runs the same
 * rule inline before first paint, so the two have to agree: this is the half
 * that reacts to the settings menu and to the OS flipping under `System`.
 */
export function useApplySettings(): void {
  const wide = useSettings((s) => s.wide);
  const theme = useSettings((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    if (wide) root.dataset.wide = "true";
    else delete root.dataset.wide;
  }, [wide]);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "System") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [theme]);
}
