"use client";

import type { ValidObjekt } from "@repo/lib/types/objekt";

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
        <ModalTitle>Generate Discord Format</ModalTitle>
        <ModalDescription>List of objekt is based on current filter.</ModalDescription>
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
                <Label>Show count</Label>
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
                <Label>Lower case</Label>
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
                <Label>Bulleted list</Label>
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
                placeholder="Select grouping mode"
              >
                <Label>Group by</Label>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem id="none" textValue="none">
                    None (member → collection)
                  </SelectItem>
                  <SelectItem id="season" textValue="season">
                    Season (member → season → collection)
                  </SelectItem>
                  <SelectItem id="season-first" textValue="season-first">
                    Season first (season → member → collection)
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
                placeholder="Select style"
              >
                <Label>Style</Label>
                <SelectTrigger />
                <SelectContent>
                  <SelectItem id="default" textValue="default">
                    Default
                  </SelectItem>
                  <SelectItem id="compact" textValue="compact">
                    Compact
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          <TextField>
            <Label>Formatted discord text</Label>
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
        <Button type="submit" onClick={onSubmit}>
          Generate
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
