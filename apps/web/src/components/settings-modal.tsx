"use client";

import { useMutation } from "@tanstack/react-query";
import type { Locale } from "intlayer";
import { Locales } from "intlayer";
import { useLocale, useIntlayer } from "next-intlayer";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useEffect, useTransition } from "react";

import { useConfigStore } from "@/hooks/use-config";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useWide } from "@/hooks/use-wide";
import { orpc } from "@/lib/orpc/client";

import { Description, Label } from "./ui/field";
import {
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "./ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger } from "./ui/select";
import { Switch } from "./ui/switch";

export function SettingsModal({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (val: boolean) => void;
}) {
  const content = useIntlayer("common");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { locale } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isCompact = useMediaQuery("(max-width: 1560px)");

  const setLocale = useMutation(orpc.config.setLocale.mutationOptions());
  const { wide, setWide } = useWide();
  const hideLabel = useConfigStore((s) => s.hideLabel);
  const setHideLabel = useConfigStore((s) => s.setHideLabel);

  useEffect(() => {
    if (resolvedTheme === "dark") {
      document.querySelector('meta[name="theme-color"]')!.setAttribute("content", "#09090b");
    } else {
      document.querySelector('meta[name="theme-color"]')!.setAttribute("content", "#ffffff");
    }
  }, [resolvedTheme]);

  const handleLocaleChange = (value: string) => {
    startTransition(async () => {
      await setLocale.mutateAsync(value as Locale);
      router.refresh();
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
              onChange={(key) => setTheme(key as string)}
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
              onChange={(key) => handleLocaleChange(key as string)}
              isDisabled={isPending}
              aria-label={content.settings.language.label.value}
            >
              <SelectTrigger />
              <SelectContent>
                <SelectItem id={Locales.ENGLISH}>
                  {content.settings.language[Locales.ENGLISH].value}
                </SelectItem>
                <SelectItem id={Locales.KOREAN}>
                  {content.settings.language[Locales.KOREAN].value}
                </SelectItem>
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
        <ModalClose>Close</ModalClose>
      </ModalFooter>
    </ModalContent>
  );
}
