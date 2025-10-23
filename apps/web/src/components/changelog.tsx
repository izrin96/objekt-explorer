"use client";

import { MegaphoneIcon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "./ui/button";
import { Disclosure, DisclosureGroup, DisclosurePanel, DisclosureTrigger } from "./ui/disclosure";
import { Link } from "./ui/link";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "./ui/modal";

export default function Changelog() {
  return (
    <Modal>
      <Button size="xs" intent="plain">
        <MegaphoneIcon size={16} weight="light" />
      </Button>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>Changelog</ModalTitle>
          <ModalDescription>
            Objekt Tracker is open source. Github link{" "}
            <Link
              className="underline"
              target="_blank"
              href="https://github.com/izrin96/objekt-explorer"
            >
              available here
            </Link>
            .
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
          <DisclosureGroup defaultExpandedKeys="4">
            <Disclosure id="4">
              <DisclosureTrigger>2025-09-13</DisclosureTrigger>
              <DisclosurePanel>
                <div className="text-fg text-sm">
                  <ul className="list-disc">
                    <li>Added Objekt Columns setting in Edit List and Edit Profile.</li>
                    <li>Added Wide/Compact layout toggle button.</li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure id="3">
              <DisclosureTrigger>2025-09-08</DisclosureTrigger>
              <DisclosurePanel>
                <div className="text-fg text-sm">
                  <ul className="list-disc">
                    <li>Improve scroll performance</li>
                    <li>
                      Remove objekt action (pin/lock) when hover an objekt in your linked profile to
                      prevent accidental click for desktop user. Use 'triple dots' menu instead.
                    </li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure id="2">
              <DisclosureTrigger>2025-08-27</DisclosureTrigger>
              <DisclosurePanel>
                <div className="text-fg text-sm">
                  <ul className="list-disc">
                    <li>
                      &quot;Hide Activity&quot; setting in Edit Profile has been replaced with a new
                      &quot;Hide Cosmo ID&quot; setting. This change ensures that transfers will
                      always be shown on the Activity page.
                    </li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure id="1">
              <DisclosureTrigger>2025-08-25</DisclosureTrigger>
              <DisclosurePanel>
                <div className="text-fg text-sm">
                  <ul className="list-disc">
                    <li>Cosmo profile links now support Abstract accounts.</li>
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
