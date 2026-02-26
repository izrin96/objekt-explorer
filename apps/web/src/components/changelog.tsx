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
            <Disclosure id="1">
              <DisclosureTrigger>2026-02-26</DisclosureTrigger>
              <DisclosurePanel>
                <div className="text-fg text-sm">
                  <ul className="list-inside list-disc leading-6">
                    <li>
                      Added objekt price support to lists. Requires setting a currency. Currently,
                      prices can only be set after adding an objekt.
                    </li>
                    <li>Added a description field to lists.</li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger>2026-02-22</DisclosureTrigger>
              <DisclosurePanel>
                <div className="text-fg text-sm">
                  <ul className="list-inside list-disc leading-6">
                    <li>
                      Added a profile list feature that bound to a profile, allowing serial numbers
                      to be displayed. Good for want-to-sell list.
                    </li>
                    <li>Added member progress chart to profile progress page.</li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger>2026-02-09</DisclosureTrigger>
              <DisclosurePanel>
                <div className="text-fg text-sm">
                  <ul className="list-inside list-disc leading-6">
                    <li>Rework COSMO verification with new method, replacing old QR method.</li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger>2026-02-06</DisclosureTrigger>
              <DisclosurePanel>
                <div className="text-fg text-sm">
                  <ul className="list-inside list-disc leading-6">
                    <li>Added Checkpoint feature to view collection at given time.</li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger>Others</DisclosureTrigger>
              <DisclosurePanel>
                <div className="text-fg text-sm">
                  <ul className="list-inside list-disc leading-6">
                    <li>Improve query performance on Activity and Trade History.</li>
                    <li>Added Korean translation.</li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
          </DisclosureGroup>
        </ModalBody>
        <ModalFooter>
          <ModalClose>Close</ModalClose>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
