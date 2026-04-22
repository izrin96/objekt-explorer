"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useIntlayer } from "next-intlayer";
import { useState } from "react";
import { Form } from "react-aria-components/Form";
import { Controller, useForm } from "react-hook-form";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/intentui/button";
import { Checkbox } from "@/components/intentui/checkbox";
import { Label } from "@/components/intentui/field";
import {
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/intentui/select";
import { TextField } from "@/components/intentui/text-field";
import { Textarea } from "@/components/intentui/textarea";
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
  const content = useIntlayer("generate_discord");
  const modalContent = useIntlayer("discord_format_modal");
  const [formatText, setFormatText] = useState("");
  const { artists } = useCosmoArtist();
  const { handleSubmit, control, setValue, watch } = useForm({
    defaultValues: {
      showCount: false,
      lowercaseCollection: false,
      bullet: false,
      showMemberEmoji: false,
      groupBy: "none" as GroupByMode,
      style: "default" as FormatStyle,
    },
  });

  const groupByValue = watch("groupBy");

  const onSubmit = handleSubmit((data) => {
    const members = makeMemberOrderedList(objekts, artists);
    const haveCollections = mapByMember(objekts, members);
    const formatted = format(haveCollections, {
      showQuantity: data.showCount,
      lowercaseCollection: data.lowercaseCollection,
      bullet: data.bullet,
      showMemberEmoji: data.showMemberEmoji,
      groupByMode: data.groupBy,
      style: data.style,
    });
    setFormatText(["## Have", "", formatted].join("\n"));
  });

  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{modalContent.title.value}</ModalTitle>
        <ModalDescription>{modalContent.description.value}</ModalDescription>
      </ModalHeader>
      <ModalBody>
        <Form className="flex flex-col gap-2" onSubmit={onSubmit} validationBehavior="aria">
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
                validationBehavior="aria"
              >
                <Label>{content.show_count.value}</Label>
              </Checkbox>
            )}
          />
          <Controller
            control={control}
            name="lowercaseCollection"
            render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
              <Checkbox
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
                validationBehavior="aria"
              >
                <Label>{content.lower_case.value}</Label>
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
                validationBehavior="aria"
              >
                <Label>{content.bulleted_list.value}</Label>
              </Checkbox>
            )}
          />
          <Controller
            control={control}
            name="showMemberEmoji"
            render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
              <Checkbox
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
                validationBehavior="aria"
              >
                <Label>{content.show_member_emoji.value}</Label>
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
                onChange={(val) => {
                  onChange(val);
                  if (val === "none") {
                    setValue("style", "default");
                  }
                }}
                onBlur={onBlur}
                placeholder={content.group_by_placeholder.value}
                validationBehavior="aria"
              >
                <Label>{content.group_by_label.value}</Label>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem id="none" textValue="none">
                    {content.group_by_none.value}
                  </SelectItem>
                  <SelectItem id="season" textValue="season">
                    {content.group_by_season.value}
                  </SelectItem>
                  <SelectItem id="season-first" textValue="season-first">
                    {content.group_by_season_first.value}
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
                placeholder={content.style_placeholder.value}
                validationBehavior="aria"
                isDisabled={groupByValue === "none"}
              >
                <Label>{content.style_label.value}</Label>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem id="default" textValue="default">
                    {content.style_default.value}
                  </SelectItem>
                  <SelectItem id="compact" textValue="compact">
                    {content.style_compact.value}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <TextField>
            <Label>{content.formatted_text_label.value}</Label>
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
          {modalContent.generate.value}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
