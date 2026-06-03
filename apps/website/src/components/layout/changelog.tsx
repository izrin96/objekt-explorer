import { NoteIcon } from "@phosphor-icons/react/dist/ssr";

import { Button } from "@/components/intentui/button";
import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  DisclosureTrigger,
} from "@/components/intentui/disclosure-group";
import { ExternalLink } from "@/components/intentui/link";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import { Note } from "@/components/intentui/note";
import { m } from "@/paraglide/messages";

export default function Changelog() {
  const changelog = [
    {
      date: "2026-06-02",
      items: [
        "Trade Matches now works with standalone Have or Want lists. No pairing required. Each list can independently find matches in one direction (Have→Want or Want→Have).",
        "Paired Have+Want lists get a new mode selector in the Trade Matches: Have only, Both, or Want only. Both mode matches your paired Have+Want against other users' paired Have+Want.",
        "Want lists can now be marked as Discoverable (no profile binding needed, except Have list).",
        "(Note: Trade matching require the partner's list to be discoverable.)",
      ],
    },
    {
      date: "2026-05-31",
      items: ["Profile banner now extends slightly outside the container."],
    },
    {
      date: "2026-05-29",
      items: [
        "Refactored list types for better user-friendliness: General, Sale, Have, and Want.",
        'Added a Trade Matches feature: This is enabled after linking a paired Have/Want list. Objekts added to your Have/Want list will only match with users who have enabled the "Discoverable" option. (Note: Discoverable mode requires Cosmo profile binding).',
        "Profile-bound Sale and Have lists can now hide serial numbers.",
        'Added a Market tab to the Objekt view. Objekts must be added to a Sale list with the "Discoverable" option enabled. Prices in the Market are automatically converted to USD for now.',
      ],
    },
    {
      date: "2026-04-20 - 2026-04-23",
      items: [
        "Added move pin order. You can now move your objekt pin.",
        "Added export button to list view to export as csv file. This could be useful in future to import into third party service like Apollo.",
        "Added member emoji option in Generate Discord format.",
      ],
    },
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
      <Button size="sq-sm" intent="plain" aria-label={m.common_changelog()}>
        <NoteIcon size={18} weight="duotone" />
      </Button>
      <ModalContent size="2xl">
        <ModalHeader>
          <ModalTitle>{m.common_changelog()}</ModalTitle>
        </ModalHeader>
        <ModalBody className="flex flex-col gap-4">
          <ChangelogNotice />
          <DisclosureGroup defaultExpandedKeys="1">
            {changelog.map((entry, index) => (
              <Disclosure key={entry.date} id={String(index + 1)}>
                <DisclosureTrigger>{entry.date}</DisclosureTrigger>
                <DisclosurePanel>
                  <div className="text-fg text-sm">
                    <ul className="list-outside list-disc pl-4 leading-6">
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
          <ModalClose>{m.common_modal_close()}</ModalClose>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function ChangelogNotice() {
  return (
    <Note intent="default" className="shrink-0">
      {m.about_discord_invite()}{" "}
      <ExternalLink className="underline" href="https://discord.gg/SWEm6RbJD3">
        discord.gg/SWEm6RbJD3
      </ExternalLink>
    </Note>
  );
}
