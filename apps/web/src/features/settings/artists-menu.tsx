import { UsersThreeIcon } from "@phosphor-icons/react";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { useCallback } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MenuCheckboxItem, MenuSub, MenuSubPopup, MenuSubTrigger } from "@/components/ui/menu";
import { ArtistAvatar } from "@/features/artist/artist-avatar";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { useSetSelectedArtists } from "@/features/artist/use-selected-artists";
import { m } from "@/paraglide/messages";

/**
 * `selectedArtists` already resolves an empty cookie to every artist, so the
 * toggle works off that rather than the raw cookie: the first write is a real
 * subset instead of "all minus one" being read as "all".
 */
function useArtistScope() {
  const { artists, selectedArtists } = useCosmoArtist();
  const setArtists = useSetSelectedArtists();
  const selected = new Set(selectedArtists.map((a) => a.id));

  const toggle = useCallback(
    (artist: ValidArtist) => {
      const on = selected.has(artist);
      // a setting, not a filter: the last artist cannot be cleared
      if (on && selected.size === 1) return;
      const next = new Set(selected);
      if (on) next.delete(artist);
      else next.add(artist);
      // keep the canonical order whatever order they were picked in
      setArtists.mutate(artists.filter((a) => next.has(a.id)).map((a) => a.id));
    },
    [artists, selected, setArtists],
  );

  return { artists, selected, toggle, isPending: setArtists.isPending };
}

/** The global artist scope as a submenu of the avatar menu. */
export function ArtistsSubmenu() {
  const { artists, selected, toggle, isPending } = useArtistScope();

  return (
    <MenuSub>
      <MenuSubTrigger>
        <UsersThreeIcon />
        {m.filter_selected_artist_aria()}
        <span className="ml-auto flex items-center -space-x-2">
          {artists
            .filter((a) => selected.has(a.id))
            .map((artist) => (
              <ArtistAvatar key={artist.id} artist={artist} />
            ))}
        </span>
      </MenuSubTrigger>
      <MenuSubPopup className="min-w-44">
        {artists.map((artist) => (
          <MenuCheckboxItem
            key={artist.id}
            disabled={isPending}
            checked={selected.has(artist.id)}
            onCheckedChange={() => toggle(artist.id)}
          >
            <span className="flex items-center gap-2">
              <ArtistAvatar artist={artist} className="ring-0" />
              {artist.title}
            </span>
          </MenuCheckboxItem>
        ))}
      </MenuSubPopup>
    </MenuSub>
  );
}

/** The same scope as a checkbox group, for the signed-out settings surface. */
export function ArtistsSection() {
  const { artists, selected, toggle, isPending } = useArtistScope();

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{m.filter_selected_artist_aria()}</span>
      <div className="flex flex-col gap-0.5">
        {artists.map((artist) => (
          <Label
            key={artist.id}
            className="hover:bg-secondary flex h-9 items-center gap-2.5 rounded-lg px-2 text-sm font-normal"
          >
            <Checkbox
              disabled={isPending}
              checked={selected.has(artist.id)}
              onCheckedChange={() => toggle(artist.id)}
            />
            <ArtistAvatar artist={artist} className="ring-0" />
            {artist.title}
          </Label>
        ))}
      </div>
      <span className="text-muted-foreground text-xs">{m.settings_artists_hint()}</span>
    </div>
  );
}
