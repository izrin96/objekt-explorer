"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Form } from "react-aria-components";
import { Controller, useForm } from "react-hook-form";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/field";
import {
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { TextField } from "@/components/ui/text-field";
import { Textarea } from "@/components/ui/textarea";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import {
  type FormatStyle,
  format,
  type GroupByMode,
  makeMemberOrderedList,
  mapByMember,
} from "@/lib/discord-format-utils";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
  objekts: ValidObjekt[];
};

export default function GenerateDiscordFormatModal({ open, setOpen, objekts }: Props) {
  const t = useTranslations("generate_discord");
  const tModal = useTranslations("discord_format_modal");
  const [formatText, setFormatText] = useState("");
  const { artists } = useCosmoArtist();
  const { handleSubmit, control } = useForm({
    defaultValues: {
      showCount: false,
      lowercase: false,
      bullet: false,
      groupBy: "none" as GroupByMode,
      style: "default" as FormatStyle,
    },
  });

  const onSubmit = handleSubmit((data) => {
    const members = makeMemberOrderedList(objekts, artists);
    const haveCollections = mapByMember(objekts, members);
    const formatted = format(haveCollections, {
      showQuantity: data.showCount,
      lowercase: data.lowercase,
      bullet: data.bullet,
      groupByMode: data.groupBy,
      style: data.style,
    });
    setFormatText(["## Have", "", formatted].join("\n"));
  });

  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{tModal("title")}</ModalTitle>
        <ModalDescription>{tModal("description")}</ModalDescription>
      </ModalHeader>
      <ModalBody>
        <Form className="flex flex-col gap-2" onSubmit={onSubmit}>
          <Controller
            control={control}
            name="showCount"
            render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
              <Checkbox
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
              >
                <Label>{t("show_count")}</Label>
              </Checkbox>
            )}
          />
          <Controller
            control={control}
            name="lowercase"
            render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
              <Checkbox
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
              >
                <Label>{t("lower_case")}</Label>
              </Checkbox>
            )}
          />
          <Controller
            control={control}
            name="bullet"
            render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
              <Checkbox
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
              >
                <Label>{t("bulleted_list")}</Label>
              </Checkbox>
            )}
          />
          <Controller
            control={control}
            name="groupBy"
            render={({ field: { name, value, onChange, onBlur } }) => (
              <Select
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                placeholder={t("group_by_placeholder")}
              >
                <Label>{t("group_by_label")}</Label>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem id="none" textValue="none">
                    {t("group_by_none")}
                  </SelectItem>
                  <SelectItem id="season" textValue="season">
                    {t("group_by_season")}
                  </SelectItem>
                  <SelectItem id="season-first" textValue="season-first">
                    {t("group_by_season_first")}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <Controller
            control={control}
            name="style"
            render={({ field: { name, value, onChange, onBlur } }) => (
              <Select
                name={name}
                value={value}
                onChange={onChange}
                onBlur={onBlur}
                placeholder={t("style_placeholder")}
              >
                <Label>{t("style_label")}</Label>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem id="default" textValue="default">
                    {t("style_default")}
                  </SelectItem>
                  <SelectItem id="compact" textValue="compact">
                    {t("style_compact")}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <TextField>
            <Label>{t("formatted_text_label")}</Label>
            <Textarea
              value={formatText}
              onChange={(e) => setFormatText(e.target.value)}
              className="max-h-64 min-h-32"
            />
          </TextField>
          <div className="flex">
            <CopyButton text={formatText} />
          </div>
        </Form>
      </ModalBody>
      <ModalFooter className="flex justify-end">
        <Button type="submit" onPress={() => onSubmit()}>
          {tModal("generate")}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
