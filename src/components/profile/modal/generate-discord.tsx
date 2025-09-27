"use client";

import { useRef, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import {
  Button,
  Checkbox,
  Form,
  ModalBody,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Textarea,
} from "@/components/ui";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { format, makeMemberOrderedList, mapByMember } from "@/lib/discord-format-utils";
import type { ValidObjekt } from "@/lib/universal/objekts";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
  objekts: ValidObjekt[];
};

export default function GenerateDiscordFormatModalProfile({ open, setOpen, objekts }: Props) {
  const formRef = useRef<HTMLFormElement>(null!);
  const [formatText, setFormatText] = useState("");
  const { artists } = useCosmoArtist();

  return (
    <ModalContent isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>Generate Discord Format</ModalTitle>
        <ModalDescription>List of objekt is based on current filter.</ModalDescription>
      </ModalHeader>
      <ModalBody>
        <Form
          className="flex flex-col gap-2"
          ref={formRef}
          onSubmit={async (e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const showCount = formData.get("showCount") === "on";
            const lowercase = formData.get("lowercase") === "on";

            const members = makeMemberOrderedList(objekts, artists);

            const haveCollections = mapByMember(objekts, members);

            setFormatText(["## Have", ...format(haveCollections, showCount, lowercase)].join("\n"));
          }}
        >
          <Checkbox label="Show count" name="showCount" />
          <Checkbox label="Lower case" name="lowercase" />
          <Textarea
            label="Formatted discord text"
            value={formatText}
            onChange={setFormatText}
            className="max-h-64 min-h-32"
          />
          <div className="flex">
            <CopyButton text={formatText} />
          </div>
        </Form>
      </ModalBody>
      <ModalFooter className="flex justify-end">
        <Button type="submit" onClick={() => formRef.current.requestSubmit()}>
          Generate
        </Button>
      </ModalFooter>
    </ModalContent>
  );
}
