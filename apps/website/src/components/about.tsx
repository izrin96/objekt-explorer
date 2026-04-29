import { InfoIcon, GithubLogoIcon, DiscordLogoIcon } from "@phosphor-icons/react/dist/ssr";
import { useIntlayer, useLocale } from "react-intlayer";

import { buttonStyles } from "./intentui/button";
import { ExternalLink } from "./intentui/link";
import { MenuItem, MenuLabel } from "./intentui/menu";
import { ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "./intentui/modal";

type Props = {
  open: boolean;
  setOpen: (val: boolean) => void;
};

export function AboutModal({ open, setOpen }: Props) {
  const content = useIntlayer("nav");
  const { locale } = useLocale();
  return (
    <ModalContent size="xl" isOpen={open} onOpenChange={setOpen}>
      <ModalHeader>
        <ModalTitle>{content.about.value}</ModalTitle>
      </ModalHeader>
      <ModalBody className="flex flex-col gap-y-4">
        <div className="text-sm">
          {locale === "ko"
            ? "오브젝트 트래커(Objekt Tracker)는 오브젝트 탐색을 위해 특별히 제작된 간편한 클라이언트 사이드 익스플로러입니다."
            : "Objekt Tracker is a simple, client-side explorer built specifically for exploring objekts."}
        </div>
        <div className="text-sm">
          {locale === "ko"
            ? "버그 제보나 건의 사항이 있으시면 지원 디스코드 서버에 참여해 주세요."
            : "Join our support Discord server for bug reporting or suggestions."}
        </div>
      </ModalBody>
      <ModalFooter className="">
        <ExternalLink
          href="https://github.com/izrin96/objekt-explorer"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles({ intent: "primary" })}
        >
          <GithubLogoIcon data-slot="icon" />
          GitHub
        </ExternalLink>
        <ExternalLink
          href="https://discord.gg/SWEm6RbJD3"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonStyles({
            intent: "primary",
          })}
        >
          <DiscordLogoIcon data-slot="icon" />
          Discord
        </ExternalLink>
      </ModalFooter>
    </ModalContent>
  );
}

export function AboutMenu({ onAction }: { onAction?: () => void }) {
  const content = useIntlayer("nav");
  return (
    <MenuItem onAction={onAction}>
      <InfoIcon data-slot="icon" />
      <MenuLabel>{content.about.value}</MenuLabel>
    </MenuItem>
  );
}
