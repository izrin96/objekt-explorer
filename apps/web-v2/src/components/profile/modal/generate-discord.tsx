import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/field";
import { Form } from "@/components/ui/form";
import {
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { format, makeMemberOrderedList, mapByMember } from "@/lib/discord-format-utils";
import type { ValidObjekt } from "@/lib/universal/objekts";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
  objekts: ValidObjekt[];
};

export default function GenerateDiscordFormatModalProfile({ open, setOpen, objekts }: Props) {
  const [formatText, setFormatText] = useState("");
  const { artists } = useCosmoArtist();
  const { handleSubmit, control } = useForm({
    defaultValues: {
      showCount: false,
      lowercase: false,
    },
  });

  const onSubmit = handleSubmit((data) => {
    const members = makeMemberOrderedList(objekts, artists);
    const haveCollections = mapByMember(objekts, members);
    setFormatText(
      ["## Have", ...format(haveCollections, data.showCount, data.lowercase)].join("\n"),
    );
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

          <Textarea
            value={formatText}
            onChange={(e) => setFormatText(e.target.value)}
            className="max-h-64 min-h-32"
          >
            <Label>Formatted discord text</Label>
          </Textarea>
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
