"use client";

import { useMutation } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import type { Locale } from "@/i18n/config";

import { useConfigStore } from "@/hooks/use-config";
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
  const t = useTranslations("common.settings");
  const { theme, setTheme } = useTheme();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setLocale = useMutation(orpc.config.setLocale.mutationOptions());
  const { wide, setWide } = useWide();
  const hideLabel = useConfigStore((s) => s.hideLabel);
  const setHideLabel = useConfigStore((s) => s.setHideLabel);

  const handleLocaleChange = (value: string) => {
    startTransition(async () => {
      await setLocale.mutateAsync(value as Locale);
      router.refresh();
    });
  };

  return (
    <ModalContent size="md" isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{t("title")}</ModalTitle>
      </ModalHeader>
      <ModalBody className="space-y-4">
        <div className="flex space-y-2">
          <div className="grow">
            <Label>{t("theme.label")}</Label>
            <Description>{t("theme.desc")}</Description>
          </div>
          <div className="flex self-center">
            <Select className="shrink" value={theme} onChange={(key) => setTheme(key as string)}>
              <SelectTrigger />
              <SelectContent>
                <SelectItem id="light">{t("theme.light")}</SelectItem>
                <SelectItem id="dark">{t("theme.dark")}</SelectItem>
                <SelectItem id="system">{t("theme.system")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex space-y-2">
          <div className="grow">
            <Label>{t("language.label")}</Label>
            <Description>{t("language.desc")}</Description>
          </div>
          <div className="flex self-center">
            <Select
              value={locale}
              onChange={(key) => handleLocaleChange(key as string)}
              isDisabled={isPending}
            >
              <SelectTrigger />
              <SelectContent>
                <SelectItem id="en">{t("language.en")}</SelectItem>
                <SelectItem id="ko">{t("language.ko")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">{t("filters.label")}</h3>

          <Switch isSelected={wide} onChange={setWide}>
            <Label>{t("filters.wide")}</Label>
            <Description>{t("filters.wide_desc")}</Description>
          </Switch>

          <Switch isSelected={hideLabel} onChange={setHideLabel}>
            <Label>{t("filters.hide_label")}</Label>
            <Description>{t("filters.hide_label_desc")}</Description>
          </Switch>
        </div>
      </ModalBody>
      <ModalFooter>
        <ModalClose>Close</ModalClose>
      </ModalFooter>
    </ModalContent>
  );
}
