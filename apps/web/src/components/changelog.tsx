"use client";

import { NoteIcon } from "@phosphor-icons/react/dist/ssr";
import { useIntlayer } from "next-intlayer";

import { Button } from "./intentui/button";
import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "./intentui/disclosure-group";
import { Link } from "./intentui/link";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "./intentui/modal";
import { Note } from "./intentui/note";

export default function Changelog() {
  const content = useIntlayer("common");

  const changelog = [
    {
      date: "2026-04-10",
      items: ["Added sorting by Rarity. Mint counts are updated hourly."],
    },
    {
      date: "2026-04-06",
      items: [
        "Added a Compare button to the list view. You can now compare the current list with your profile or another list. Note: This is an early implementation, UX is still being refined.",
      ],
    },
  ] as const;

  return (
    <Modal>
      <Button size="xs" intent="plain" className="px-1.5 sm:px-1.5">
        <NoteIcon size={16} weight="duotone" />
      </Button>
      <ModalContent size="2xl">
        <ModalHeader>
          <ModalTitle>{content.changelog.value}</ModalTitle>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <ChangelogNotice />
          <DisclosureGroup defaultExpandedKeys="1">
            {changelog.map((entry, index) => (
              <Disclosure key={entry.date} id={String(index + 1)}>
                <DisclosureTrigger>{entry.date}</DisclosureTrigger>
                <DisclosurePanel>
                  <div className="text-fg text-sm">
                    <ul className="list-inside list-disc leading-6">
                      {entry.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </DisclosurePanel>
              </Disclosure>
            ))}
          </DisclosureGroup>
        </ModalBody>
        <ModalFooter>
          <ModalClose>{content.modal.close.value}</ModalClose>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function ChangelogNotice() {
  return (
    <Note
      intent="default"
      className="bg-(--color-indigo-500)/15 px-3 py-2 text-(--color-indigo-700) dark:text-(--color-indigo-300)"
    >
      Join our support Discord server for bug reporting or suggestions.{" "}
      <Link className="underline" href="https://discord.gg/SWEm6RbJD3" target="_blank">
        discord.gg/SWEm6RbJD3
      </Link>
    </Note>
  );
}
