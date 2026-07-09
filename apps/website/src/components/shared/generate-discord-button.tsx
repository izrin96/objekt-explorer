import { DiscordLogoIcon } from "@phosphor-icons/react/dist/ssr";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { useState } from "react";
import { Form } from "react-aria-components/Form";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/intentui/button";
import { Checkbox, CheckboxField } from "@/components/intentui/checkbox";
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
import { CopyButton } from "@/components/shared/copy-button";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { useFilterData } from "@/hooks/use-filter-data";
import { type FormatStyle, format, type GroupByMode } from "@/lib/discord-format-utils";
import { m } from "@/paraglide/messages";

export function GenerateDiscordButton({ objekts }: { objekts: ValidObjekt[] }) {
  const [genOpen, setGenOpen] = useState(false);
  return (
    <>
      <GenerateDiscordFormatModal objekts={objekts} open={genOpen} setOpen={setGenOpen} />
      <Button intent="outline" onPress={() => setGenOpen(true)}>
        <DiscordLogoIcon />
        {m.discord_format_modal_button()}
      </Button>
    </>
  );
}

function GenerateDiscordFormatModal({
  objekts,
  open,
  setOpen,
}: {
  objekts: ValidObjekt[];
  open: boolean;
  setOpen: (val: boolean) => void;
}) {
  const [formatText, setFormatText] = useState("");
  const { compareArtistMember } = useCosmoArtist();
  const { compareSeason } = useFilterData();
  const { handleSubmit, control, setValue, watch } = useForm({
    defaultValues: {
      showCount: false,
      lowercaseCollection: false,
      bullet: false,
      showMemberEmoji: false,
      hideType: false,
      groupBy: "none" as GroupByMode,
      style: "default" as FormatStyle,
    },
  });

  const groupByValue = watch("groupBy");

  const onSubmit = handleSubmit((data) => {
    const formatted = format(objekts, {
      showQuantity: data.showCount,
      lowercaseCollection: data.lowercaseCollection,
      bullet: data.bullet,
      showMemberEmoji: data.showMemberEmoji,
      hideType: data.hideType,
      groupByMode: data.groupBy,
      style: data.style,
      compareArtistMember,
      compareSeason,
    });
    setFormatText(["## Have", "", formatted].join("\n"));
  });

  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{m.discord_format_modal_title()}</ModalTitle>
        <ModalDescription>{m.discord_format_modal_description()}</ModalDescription>
      </ModalHeader>
      <ModalBody>
        <Form className="flex flex-col gap-2" onSubmit={onSubmit} validationBehavior="aria">
          <Controller
            control={control}
            name="showCount"
            render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
              <CheckboxField
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
                validationBehavior="aria"
              >
                <Checkbox>{m.generate_discord_show_count()}</Checkbox>
              </CheckboxField>
            )}
          />
          <Controller
            control={control}
            name="lowercaseCollection"
            render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
              <CheckboxField
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
                validationBehavior="aria"
              >
                <Checkbox>{m.generate_discord_lower_case()}</Checkbox>
              </CheckboxField>
            )}
          />
          <Controller
            control={control}
            name="bullet"
            render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
              <CheckboxField
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
                validationBehavior="aria"
              >
                <Checkbox>{m.generate_discord_bulleted_list()}</Checkbox>
              </CheckboxField>
            )}
          />
          <Controller
            control={control}
            name="showMemberEmoji"
            render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
              <CheckboxField
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
                validationBehavior="aria"
              >
                <Checkbox>{m.generate_discord_show_member_emoji()}</Checkbox>
              </CheckboxField>
            )}
          />
          <Controller
            control={control}
            name="hideType"
            render={({ field: { name, value, onChange, onBlur }, fieldState: { invalid } }) => (
              <CheckboxField
                name={name}
                isSelected={value}
                onChange={onChange}
                onBlur={onBlur}
                isInvalid={invalid}
                validationBehavior="aria"
              >
                <Checkbox>{m.generate_discord_hide_type()}</Checkbox>
              </CheckboxField>
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
                placeholder={m.generate_discord_group_by_placeholder()}
                validationBehavior="aria"
              >
                <Label>{m.generate_discord_group_by_label()}</Label>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem id="none" textValue="none">
                    {m.generate_discord_group_by_none()}
                  </SelectItem>
                  <SelectItem id="season" textValue="season">
                    {m.generate_discord_group_by_season()}
                  </SelectItem>
                  <SelectItem id="season-first" textValue="season-first">
                    {m.generate_discord_group_by_season_first()}
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
                placeholder={m.generate_discord_style_placeholder()}
                validationBehavior="aria"
                isDisabled={groupByValue === "none"}
              >
                <Label>{m.generate_discord_style_label()}</Label>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem id="default" textValue="default">
                    {m.generate_discord_style_default()}
                  </SelectItem>
                  <SelectItem id="compact" textValue="compact">
                    {m.generate_discord_style_compact()}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <TextField>
            <Label>{m.generate_discord_formatted_text_label()}</Label>
            <Textarea
              value={formatText}
              onChange={(e) => setFormatText(e.target.value)}
              className="max-h-64 min-h-32"
            />
          </TextField>
          <div className="flex">
            <CopyButton text={formatText} variant="button" toastMessage={m.common_copy_copied()} />
          </div>
        </Form>
      </ModalBody>
      <ModalFooter className="flex justify-end">
        <Button type="submit" onPress={() => onSubmit()}>
          {m.discord_format_modal_generate()}
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
