import { useMutation } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { useTransition } from "react";
import { useLocale, useIntlayer } from "react-intlayer";

import { useTheme } from "@/components/theme-provider";
import { useConfigStore } from "@/hooks/use-config";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useWide } from "@/hooks/use-wide";
import type { Locale } from "@/lib/locale";
import { orpc } from "@/lib/orpc/client";

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
  const content = useIntlayer("common");
  const { theme, setTheme } = useTheme();
  const { locale } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isCompact = useMediaQuery("(max-width: 1560px)");

  const setLocale = useMutation(orpc.config.setLocale.mutationOptions());
  const { wide, setWide } = useWide();
  const hideLabel = useConfigStore((s) => s.hideLabel);
  const setHideLabel = useConfigStore((s) => s.setHideLabel);

  const handleLocaleChange = (value: Locale) => {
    startTransition(async () => {
      await setLocale.mutateAsync(value);
      void router.invalidate();
    });
  };

  return (
    <ModalContent size="md" isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{content.settings.title.value}</ModalTitle>
      </ModalHeader>
      <ModalBody className="space-y-4">
        <div className="flex space-y-2">
          <div className="grow">
            <Label>{content.settings.theme.label.value}</Label>
            <Description>{content.settings.theme.desc.value}</Description>
          </div>
          <div className="flex self-center">
            <Select
              className="shrink"
              value={theme}
              onChange={(key) => setTheme(key as "dark" | "light" | "system")}
              aria-label={content.settings.theme.label.value}
            >
              <SelectTrigger />
              <SelectContent>
                <SelectItem id="light">{content.settings.theme.light.value}</SelectItem>
                <SelectItem id="dark">{content.settings.theme.dark.value}</SelectItem>
                <SelectItem id="system">{content.settings.theme.system.value}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex space-y-2">
          <div className="grow">
            <Label>{content.settings.language.label.value}</Label>
            <Description>{content.settings.language.desc.value}</Description>
          </div>
          <div className="flex self-center">
            <Select
              value={locale}
              onChange={(key) => handleLocaleChange(key as Locale)}
              isDisabled={isPending}
              aria-label={content.settings.language.label.value}
            >
              <SelectTrigger />
              <SelectContent>
                <SelectItem id="en">{content.settings.language.en.value}</SelectItem>
                <SelectItem id="ko">{content.settings.language.ko.value}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">{content.settings.filters.label.value}</h3>

          {!isCompact && (
            <Switch
              isSelected={wide}
              onChange={setWide}
              aria-label={content.settings.filters.wide.value}
            >
              <Label>{content.settings.filters.wide.value}</Label>
              <Description>{content.settings.filters.wide_desc.value}</Description>
            </Switch>
          )}

          <Switch
            isSelected={hideLabel}
            onChange={setHideLabel}
            aria-label={content.settings.filters.hide_label.value}
          >
            <Label>{content.settings.filters.hide_label.value}</Label>
            <Description>{content.settings.filters.hide_label_desc.value}</Description>
          </Switch>
        </div>
      </ModalBody>
      <ModalFooter>
        <ModalClose>{content.modal.close.value}</ModalClose>
      </ModalFooter>
    </ModalContent>
  );
}
