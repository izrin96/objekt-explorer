import { InfoIcon, GithubLogoIcon, DiscordLogoIcon } from "@phosphor-icons/react/dist/ssr";

import { buttonStyles } from "@/components/intentui/button";
import { ExternalLink } from "@/components/intentui/link";
import { MenuItem, MenuLabel } from "@/components/intentui/menu";
import {
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/intentui/modal";
import { m } from "@/paraglide/messages";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function AboutModal({ open, setOpen }: Props) {
  return (
    <ModalContent size="xl" isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{m.nav_about()}</ModalTitle>
      </ModalHeader>
      <ModalBody className="flex flex-col gap-y-4">
        <div className="text-sm">{m.about_description()}</div>
        <div className="text-sm">{m.about_discord_invite()}</div>
      </ModalBody>
      <ModalFooter className="">
        <ExternalLink
          href="https://github.com/izrin96/objekt-explorer"
          className={buttonStyles({ intent: "outline" })}
        >
          <GithubLogoIcon />
          GitHub
        </ExternalLink>
        <ExternalLink
          href="https://discord.gg/SWEm6RbJD3"
          className={buttonStyles({
            intent: "outline",
          })}
        >
          <DiscordLogoIcon />
          Discord
        </ExternalLink>
      </ModalFooter>
    </ModalContent>
  );
}

export function AboutMenu({ onAction }: { onAction?: () => void }) {
  return (
    <MenuItem onAction={onAction}>
      <InfoIcon />
      <MenuLabel>{m.nav_about()}</MenuLabel>
    </MenuItem>
  );
}
