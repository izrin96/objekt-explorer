import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectItem,
  SelectPopup,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArtistsSection } from "@/features/settings/artists-menu";
import { currencyName, useCurrency } from "@/features/settings/use-currency";
import { m } from "@/paraglide/messages";
import { getLocale, locales, setLocale } from "@/paraglide/runtime";
import { THEMES, type Theme, useSettings } from "@/stores/settings";

type Locale = (typeof locales)[number];

const THEME_LABEL: Record<Theme, () => string> = {
  System: m.common_settings_theme_system,
  Light: m.common_settings_theme_light,
  Dark: m.common_settings_theme_dark,
};

const LOCALE_LABEL: Record<Locale, () => string> = {
  en: m.common_settings_language_en,
  ko: m.common_settings_language_ko,
  ja: m.common_settings_language_ja,
};

/**
 * Appearance, language and the artist scope. The scope also lives in the
 * avatar menu, but a signed-out visitor has no avatar menu, so this dialog is
 * the one surface that always reaches it.
 */
export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const theme = useSettings((s) => s.theme);
  const wide = useSettings((s) => s.wide);
  const hideLabel = useSettings((s) => s.hideLabel);
  const set = useSettings((s) => s.set);
  const locale = getLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">{m.common_settings_title()}</DialogTitle>
          <DialogDescription>{m.settings_description()}</DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-theme">{m.common_settings_theme_label()}</Label>
              <Select
                value={theme}
                onValueChange={(v: Theme | null) => v !== null && set({ theme: v })}
              >
                <SelectTrigger id="settings-theme">
                  <SelectValue>{(v: Theme) => THEME_LABEL[v]()}</SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {THEMES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {THEME_LABEL[t]()}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="settings-language">{m.common_settings_language_label()}</Label>
              <Select
                value={locale}
                // sets the cookie and reloads, so the server re-renders in the
                // new language rather than only the strings already mounted
                onValueChange={(v: Locale | null) => v !== null && void setLocale(v)}
              >
                <SelectTrigger id="settings-language">
                  <SelectValue>{(v: Locale) => LOCALE_LABEL[v]()}</SelectValue>
                </SelectTrigger>
                <SelectPopup>
                  {locales.map((l) => (
                    <SelectItem key={l} value={l}>
                      {LOCALE_LABEL[l]()}
                    </SelectItem>
                  ))}
                </SelectPopup>
              </Select>
            </div>

            <CurrencySetting />

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{m.common_settings_filters_label()}</span>
              {/* Base UI puts `id` on the Switch's hidden input and points the
                  visible `role=switch` at `${id}-label`, so the label needs
                  that exact id or the reference dangles */}
              <SettingSwitch
                id="settings-wide"
                label={m.common_settings_filters_wide()}
                description={m.common_settings_filters_wide_desc()}
                checked={wide}
                onCheckedChange={(checked) => set({ wide: checked })}
              />
              <SettingSwitch
                id="settings-hide-label"
                label={m.common_settings_filters_hide_label()}
                description={m.common_settings_filters_hide_label_desc()}
                checked={hideLabel}
                onCheckedChange={(checked) => set({ hideLabel: checked })}
              />
            </div>

            <ArtistsSection />
          </div>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

/** Its own component so the rates query only runs while the dialog is mounted. */
function CurrencySetting() {
  const preferred = useSettings((s) => s.currency);
  const set = useSettings((s) => s.set);
  const { codes } = useCurrency();
  // the stored code stays selectable before the rates answer
  const options = codes.includes(preferred) ? codes : [...codes, preferred].toSorted();

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="settings-currency">{m.common_settings_currency_label()}</Label>
      <span className="text-muted-foreground -mt-1 text-xs">
        {m.common_settings_currency_desc()}
      </span>
      <Select
        value={preferred}
        onValueChange={(v: string | null) => v !== null && set({ currency: v })}
      >
        <SelectTrigger id="settings-currency">
          <SelectValue>{(v: string) => <span className="font-mono">{v}</span>}</SelectValue>
        </SelectTrigger>
        <SelectPopup alignItemWithTrigger={false} className="max-h-72">
          {options.map((code) => (
            <SelectItem key={code} value={code}>
              <span className="font-mono">{code}</span>
              <span className="text-muted-foreground ml-2">{currencyName(code)}</span>
            </SelectItem>
          ))}
        </SelectPopup>
      </Select>
    </div>
  );
}

function SettingSwitch({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Label
      id={`${id}-label`}
      htmlFor={id}
      className="flex items-start justify-between gap-4 font-normal"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-muted-foreground text-xs">{description}</span>
      </span>
      <Switch
        id={id}
        className="mt-0.5 shrink-0"
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
    </Label>
  );
}
