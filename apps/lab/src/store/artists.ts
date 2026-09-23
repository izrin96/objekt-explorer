import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { LabArtist } from "@/fixtures/objekts";

/**
 * The globally selected artists — a user setting, not a filter. It scopes
 * every surface (home, market, activity, lists, profile), the same way
 * `config.setArtists` does in `apps/website`. Persisted to localStorage;
 * zustand's `persist` swallows storage failures, so private mode is fine.
 */
export const ARTISTS: readonly LabArtist[] = ["tripleS", "ARTMS", "idntt"];

type ArtistState = {
  selected: LabArtist[];
  toggle: (artist: LabArtist) => void;
};

export const useArtists = create<ArtistState>()(
  persist(
    (set) => ({
      selected: [...ARTISTS],
      toggle: (artist) =>
        set((state) => {
          const on = state.selected.includes(artist);
          // a settings toggle, not a filter: the last artist cannot be cleared
          if (on && state.selected.length === 1) return state;
          const next = on
            ? state.selected.filter((a) => a !== artist)
            : [...state.selected, artist];
          // keep the canonical order whatever order they were picked in
          return { selected: ARTISTS.filter((a) => next.includes(a)) };
        }),
    }),
    { name: "lab:artists" },
  ),
);

/** drop rows belonging to an artist the user has switched off globally */
export function scopeArtists<T extends { artist: LabArtist }>(
  rows: readonly T[],
  selected: readonly LabArtist[],
): T[] {
  return rows.filter((row) => selected.includes(row.artist));
}
