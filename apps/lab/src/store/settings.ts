import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const THEMES = ["System", "Light", "Dark"] as const;
export const LANGUAGES = ["English", "한국어", "Bahasa Melayu"] as const;

export type Theme = (typeof THEMES)[number];
export type Language = (typeof LANGUAGES)[number];

/**
 * Device-level settings, the lab's stand-in for the app's `useConfigStore`.
 * Persisted, because every one of them is a preference the user sets once.
 */
type SettingsState = {
  theme: Theme;
  language: Language;
  /** `wide` in the app's config store: drop the container's max width */
  wide: boolean;
  set: (patch: Partial<Pick<SettingsState, "theme" | "language" | "wide">>) => void;
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "System",
      language: "English",
      wide: false,
      set: (patch) => set(patch),
    }),
    { name: "lab:settings" },
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
 * Mirrors `wide` onto `<html data-wide>`, so every container can opt out of
 * the max width with one ancestor variant instead of threading a prop through
 * the nav, the main box and the profile banner — and `theme` onto `<html
 * class="dark">`, which is what `app.css`'s `dark` variant keys on.
 *
 * `index.html` runs the same rule inline before first paint, so the two have
 * to agree: this is the half that reacts to the menu and to the OS flipping
 * under a `System` setting.
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
