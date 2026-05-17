import { useTransition } from "react";

import { useTheme } from "@/components/theme-provider";
import { useConfigStore } from "@/hooks/use-config";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useWide } from "@/hooks/use-wide";
import type { Locale } from "@/lib/locale";
import { m } from "@/paraglide/messages";
import { getLocale, setLocale as setParaglideLocale } from "@/paraglide/runtime";

import { Description, Label } from "./intentui/field";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "./intentui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./intentui/select";
import { Switch } from "./intentui/switch";

export function SettingsModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (val: boolean) => void;
}) {
  const { theme, setTheme } = useTheme();
  const locale = getLocale();
  const [isPending] = useTransition();
  const isCompact = useMediaQuery("(max-width: 1560px)");
  const { wide, setWide } = useWide();
  const hideLabel = useConfigStore((s) => s.hideLabel);
  const setHideLabel = useConfigStore((s) => s.setHideLabel);

  const handleLocaleChange = (value: Locale) => {
    void setParaglideLocale(value);
  };

  return (
    <ModalContent size="md" isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{m.common_settings_title()}</ModalTitle>
      </ModalHeader>
      <ModalBody className="space-y-4">
        <div className="flex space-y-2">
          <div className="grow">
            <Label>{m.common_settings_theme_label()}</Label>
            <Description>{m.common_settings_theme_desc()}</Description>
          </div>
          <div className="flex self-center">
            <Select
              className="shrink"
              value={theme}
              onChange={(key) => setTheme(key as "dark" | "light" | "system")}
              aria-label={m.common_settings_theme_label()}
            >
              <SelectTrigger />
              <SelectContent>
                <SelectItem id="light">{m.common_settings_theme_light()}</SelectItem>
                <SelectItem id="dark">{m.common_settings_theme_dark()}</SelectItem>
                <SelectItem id="system">{m.common_settings_theme_system()}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex space-y-2">
          <div className="grow">
            <Label>{m.common_settings_language_label()}</Label>
            <Description>{m.common_settings_language_desc()}</Description>
          </div>
          <div className="flex self-center">
            <Select
              value={locale}
              onChange={(key) => handleLocaleChange(key as Locale)}
              isDisabled={isPending}
              aria-label={m.common_settings_language_label()}
            >
              <SelectTrigger />
              <SelectContent>
                <SelectItem id="en">{m.common_settings_language_en()}</SelectItem>
                <SelectItem id="ko">{m.common_settings_language_ko()}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">{m.common_settings_filters_label()}</h3>

          {!isCompact && (
            <Switch
              isSelected={wide}
              onChange={setWide}
              aria-label={m.common_settings_filters_wide()}
            >
              <Label>{m.common_settings_filters_wide()}</Label>
              <Description>{m.common_settings_filters_wide_desc()}</Description>
            </Switch>
          )}

          <Switch
            isSelected={hideLabel}
            onChange={setHideLabel}
            aria-label={m.common_settings_filters_hide_label()}
          >
            <Label>{m.common_settings_filters_hide_label()}</Label>
            <Description>{m.common_settings_filters_hide_label_desc()}</Description>
          </Switch>
        </div>
      </ModalBody>
      <ModalFooter>
        <ModalClose>{m.common_modal_close()}</ModalClose>
      </ModalFooter>
    </ModalContent>
  );
}
