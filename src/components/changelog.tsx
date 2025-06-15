"use client";

import React from "react";
import {
  Button,
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
  Link,
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
          <DisclosureGroup defaultExpandedKeys="1">
            <Disclosure id="1">
              <DisclosureTrigger>2025-06-15</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>
                      Implement Cosmo Live.
                    </li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger>2025-06-03</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>
                      Added a banner image cropping feature in Edit Profile.
                    </li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger>2025-05-30</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>Added Live Activity page.</li>
                    <li>
                      Added option to hide from Activity in Edit Profile.
                      Existing Cosmo profiles with either &apos;Hide
                      Serial&apos; or &apos;Private Profile&apos; enabled have
                      been updated to hide activity by default.
                    </li>
                    <li>Added filter by objekt color.</li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger>2025-05-27</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>Added sign in with twitter and email option.</li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger>2025-05-23</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>
                      Cosmo profile will hide user info by default after
                      successful link.
                    </li>
                    <li>
                      Added show social option in manage account. All users are
                      set to hide by default. Please update if you want to show
                      it.
                    </li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
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
            <Disclosure>
              <DisclosureTrigger>2025-05-20</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>
                      Allow user to hide user info from list and Cosmo profile.
                      Option are available in both Edit List and Edit Profile.
                    </li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger>2025-05-18</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>
                      User can now customize their Cosmo profile banner. Support
                      video and image. User must link with their Cosmo profile
                      first.
                    </li>
                    <li>Update site theme.</li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger>2025-05-15</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>
                      Added new Progress by Member statistic chart to Cosmo
                      profile.
                    </li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger>2025-05-11</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>
                      User can now pin objekt. User must link with their Cosmo
                      profile first.
                    </li>
                  </ul>
                </div>
              </DisclosurePanel>
            </Disclosure>
            <Disclosure>
              <DisclosureTrigger>Unknown</DisclosureTrigger>
              <DisclosurePanel>
                <div className="prose text-fg text-sm">
                  <ul>
                    <li>Added Generate Discord Format List feature.</li>
                    <li>
                      Added Refresh Profile button to pull latest Discord info.
                    </li>
                    <li>New domain, move out from Vercel hosting.</li>
                    <li>
                      Added support to search by double season number like
                      AA201.
                    </li>
                    <li>
                      Allow user to link their Cosmo profile with their account.
                      Support multiple Cosmo profile.
                    </li>
                    <li>Added List feature.</li>
                    <li>Added Sign in with Discord.</li>
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
