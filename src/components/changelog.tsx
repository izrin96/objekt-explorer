"use client";

import React from "react";
import {
  Button,
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
  Modal,
} from "./ui";
import { MegaphoneIcon } from "@phosphor-icons/react/dist/ssr";

export default function Changelog() {
  return (
    <Modal>
      <Button size="extra-small" intent="plain" className="">
        <MegaphoneIcon size={18} weight="light" />
      </Button>
      <Modal.Content>
        <Modal.Header>
          <Modal.Title>Changelog</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <DisclosureGroup defaultExpandedKeys={"1"}>
            <Disclosure id={"1"}>
              <DisclosureTrigger>2025-05-22</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>
                      User can now hide their objekt from serial lookup and
                      private their Cosmo profile. Option are available in Edit
                      Profile. User must link with their Cosmo profile first.
                    </li>
                    <li>
                      Added menu on objekt modal to allow user quickly add to
                      list.
                    </li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure id={"2"}>
              <DisclosureTrigger>2025-05-20</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>
                      Allow user to hide Discord info from list and Cosmo
                      profile. Option are available in Edit List and Edit
                      Profile.
                    </li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure id={"3"}>
              <DisclosureTrigger>2025-05-18</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>
                      User can now customize their Cosmo profile banner. Support
                      video and image. User must link with their Cosmo profile
                      first.
                    </li>
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
