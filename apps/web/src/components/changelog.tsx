"use client";

import { NoteIcon } from "@phosphor-icons/react/dist/ssr";
import { useTranslations } from "next-intl";

import { Button } from "./ui/button";
import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "./ui/disclosure-group";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "./ui/modal";

export default function Changelog() {
  const t = useTranslations("common");

  const changelog = [
    {
      date: "2026-02-28",
      items: ["Added objekt selling note to the list."],
    },
    {
      date: "2026-02-26",
      items: [
        "Added objekt price support to the list. Requires setting a currency. Currently, prices can only be set after adding an objekt.",
        "Added a description field to the list.",
      ],
    },
    {
      date: "2026-02-22",
      items: [
        "Added a profile list feature that bound to a profile, allowing serial numbers to be displayed. Good for want-to-sell list.",
        "Added member progress chart to profile progress page.",
      ],
    },
    {
      date: "2026-02-09",
      items: ["Rework COSMO verification with new method, replacing old QR method."],
    },
    {
      date: "2026-02-06",
      items: ["Added Snapshot feature to view collection at given time."],
    },
    {
      date: "Others",
      items: [
        "Improve query performance on Activity and Trade History.",
        "Added Korean translation.",
      ],
    },
  ] as const;

  return (
    <Modal>
      <Button size="xs" intent="plain" className="px-1.5 sm:px-1.5">
        <NoteIcon size={16} weight="duotone" />
      </Button>
      <ModalContent size="xl">
        <ModalHeader>
          <ModalTitle>{t("changelog")}</ModalTitle>
        </ModalHeader>
        <ModalBody>
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
          <ModalClose>Close</ModalClose>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
