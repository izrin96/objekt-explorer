import { UsersThreeIcon } from "@phosphor-icons/react";

import { ArtistAvatar } from "@/components/artist-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { MenuCheckboxItem, MenuSub, MenuSubPopup, MenuSubTrigger } from "@/components/ui/menu";
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ARTISTS, useArtists } from "@/store/artists";
import { LANGUAGES, type Language, THEMES, type Theme, useSettings } from "@/store/settings";

/**
 * Settings: appearance, language, the layout switches and the artist scope.
 * The artist picker also lives in the avatar menu, but a signed-out visitor
 * has no avatar menu, so this dialog is the one place that always reaches the
 * setting. All of it lives in the persisted settings store, not in this
 * component, so a reload keeps it and `<main>` can read `wide` without a prop.
 */
export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { theme, language, wide, set } = useSettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Settings</DialogTitle>
          <DialogDescription>Appearance and language for this device.</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-theme">Theme</Label>
              <Select
                value={theme}
                onValueChange={(v: Theme | null) => v !== null && set({ theme: v })}
              >
                <SelectTrigger id="settings-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {THEMES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-language">Language</Label>
              <Select
                value={language}
                onValueChange={(v: Language | null) => v !== null && set({ language: v })}
              >
                <SelectTrigger id="settings-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectPopup>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>
            {/* `common_settings_filters_*` in apps/website/messages/en.json */}
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Filters</span>
              {/* Base UI puts `id` on the Switch's hidden input and points the
                  visible `role=switch` at `${id}-label`, so the label needs
                  that exact id or the reference dangles */}
              <Label
                id="settings-wide-label"
                htmlFor="settings-wide"
                className="flex items-start justify-between gap-4 font-normal"
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium">Wide layout</span>
                  <span className="text-muted-foreground text-xs">
                    Use full width for collection grid
                  </span>
                </span>
                <Switch
                  id="settings-wide"
                  className="mt-0.5 shrink-0"
                  checked={wide}
                  onCheckedChange={(checked) => set({ wide: checked })}
                />
              </Label>
            </div>
            <ArtistsSection />
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Close</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

/**
 * The artist scope as a checkbox group, for the signed-out surface. Same store
 * and same rule as the menu version: the last artist cannot be turned off, so
 * a refused toggle simply re-renders the box checked.
 */
function ArtistsSection() {
  const { selected, toggle } = useArtists();

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">Artists</span>
      <div className="flex flex-col gap-0.5">
        {ARTISTS.map((artist) => (
          <Label
            key={artist}
            className="hover:bg-secondary flex h-9 items-center gap-2.5 rounded-lg px-2 text-sm font-normal"
          >
            <Checkbox checked={selected.includes(artist)} onCheckedChange={() => toggle(artist)} />
            <ArtistAvatar artist={artist} className="ring-0" />
            {artist}
          </Label>
        ))}
      </div>
      <span className="text-muted-foreground text-xs">
        Scopes every page. At least one artist stays on.
      </span>
    </div>
  );
}

/**
 * The global artist scope as a submenu of the avatar menu. Port of
 * `apps/website/src/components/filters/filter-selected-artist.tsx`: a setting,
 * not a filter, so the popup stays open across picks and the last artist
 * cannot be turned off.
 */
export function ArtistsSubmenu() {
  const { selected, toggle } = useArtists();

  return (
    <MenuSub>
      <MenuSubTrigger>
        <UsersThreeIcon />
        Artists
        <span className="ml-auto flex items-center -space-x-2">
          {selected.map((artist) => (
            <ArtistAvatar key={artist} artist={artist} />
          ))}
        </span>
      </MenuSubTrigger>
      <MenuSubPopup className="min-w-44">
        {ARTISTS.map((artist) => (
          <MenuCheckboxItem
            key={artist}
            checked={selected.includes(artist)}
            onCheckedChange={() => toggle(artist)}
          >
            <span className="flex items-center gap-2">
              <ArtistAvatar artist={artist} className="ring-0" />
              {artist}
            </span>
          </MenuCheckboxItem>
        ))}
      </MenuSubPopup>
    </MenuSub>
  );
}
