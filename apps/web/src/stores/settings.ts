import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

import { THEME_COLORS } from "@/lib/utils";

import { LEGACY_CONFIG_KEY, LEGACY_THEME_KEY, legacyState, seededStorage } from "./legacy-storage";

export const THEMES = ["System", "Light", "Dark"] as const;

export type Theme = (typeof THEMES)[number];

export const SETTINGS_STORAGE_KEY = "web:settings";

type SettingsState = {
  theme: Theme;
  /** drop the container's max width */
  wide: boolean;
  /** hide collection labels on objekt cards */
  hideLabel: boolean;
  /** collapse every profile banner to a hint strip */
  hideBanner: boolean;
  /** ISO 4217 code every marketplace price is converted into */
  currency: string;
  set: (
    patch: Partial<Pick<SettingsState, "theme" | "wide" | "hideLabel" | "hideBanner" | "currency">>,
  ) => void;
};

/** the website's theme key is a bare string, written by tanstack-theme-kit */
const LEGACY_THEME: Record<string, Theme> = { light: "Light", dark: "Dark", system: "System" };

/** the website spread these over its `config` store and the theme kit's key */
function seedSettings(): Partial<SettingsState> | undefined {
  const config = legacyState(LEGACY_CONFIG_KEY);
  const theme = LEGACY_THEME[window.localStorage.getItem(LEGACY_THEME_KEY) ?? ""];
  if (config === undefined && theme === undefined) return undefined;

  const seed: Partial<SettingsState> = {};
  if (theme !== undefined) seed.theme = theme;
  if (typeof config?.wide === "boolean") seed.wide = config.wide;
  if (typeof config?.hideLabel === "boolean") seed.hideLabel = config.hideLabel;
  if (typeof config?.currency === "string") seed.currency = config.currency;
  return seed;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "System",
      wide: false,
      hideLabel: false,
      hideBanner: false,
      currency: "USD",
      set: (patch) => set(patch),
    }),
    { name: SETTINGS_STORAGE_KEY, storage: seededStorage(seedSettings) },
  ),
);

/** `app.css` declares `@custom-variant dark (&:is(.dark *))`, so the theme is one class */
function applyTheme(theme: Theme): void {
  const dark =
    theme === "Dark" ||
    (theme === "System" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  // the status bar follows this, not the class
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", dark ? THEME_COLORS.dark : THEME_COLORS.light);
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
