"use client";

import { MegaphoneIcon } from "@phosphor-icons/react/dist/ssr";
import {
  Button,
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
  Link,
  Modal,
} from "./ui";

export default function Changelog() {
  return (
    <Modal>
      <Button size="xs" intent="plain">
        <MegaphoneIcon size={16} weight="light" />
      </Button>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>Changelog</Modal.Title>
          <Modal.Description>
            Objekt Tracker is open source. Github link{" "}
            <Link
              className="underline"
              target="_blank"
              href="https://github.com/izrin96/objekt-explorer"
            >
              available here
            </Link>
            .
          </Modal.Description>
        </Modal.Header>
        <Modal.Body>
          <DisclosureGroup defaultExpandedKeys="4">
            <Disclosure id="4">
              <DisclosureTrigger>2025-09-13</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>Added Objekt Columns setting in Edit List and Edit Profile.</li>
                    <li>Added Wide/Compact layout toggle button.</li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure id="3">
              <DisclosureTrigger>2025-09-08</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
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
                <div className="prose text-fg text-sm">
                  <ul>
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
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>Cosmo profile links now support Abstract accounts.</li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
          </DisclosureGroup>
        </Modal.Body>
        <Modal.Footer>
          <Modal.Close>Close</Modal.Close>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
