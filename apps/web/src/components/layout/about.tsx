import { CodeIcon, DiscordLogoIcon, GithubLogoIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { m } from "@/paraglide/messages";

const DISCORD_INVITE = "https://discord.gg/SWEm6RbJD3";
const GITHUB_REPO = "https://github.com/izrin96/objekt-explorer";
const API_DOCS = "/api/v1/";
const TRIPLES_LOVE = "https://triples.love/p/objekttop/?lang=en&utm_source=badge";

export function AboutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{m.nav_about()}</DialogTitle>
          <DialogDescription className="sr-only">{m.about_description()}</DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex flex-col gap-3 text-sm">
          <p>{m.about_description()}</p>
          <p>{m.about_discord_invite()}</p>
          <a
            href={TRIPLES_LOVE}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-visible:ring-ring w-fit rounded-sm outline-none focus-visible:ring-2"
          >
            <img
              src="https://triples.love/badges/listed-light.svg"
              alt={m.about_listed_badge()}
              width={216}
              height={32}
              loading="lazy"
              decoding="async"
              className="h-auto max-w-full dark:hidden"
            />
            <img
              src="https://triples.love/badges/listed-dark.svg"
              alt={m.about_listed_badge()}
              width={216}
              height={32}
              loading="lazy"
              decoding="async"
              className="hidden h-auto max-w-full dark:block"
            />
          </a>
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{m.common_modal_close()}</DialogClose>
          <Button
            variant="outline"
            render={<a href={GITHUB_REPO} target="_blank" rel="noreferrer" />}
          >
            <GithubLogoIcon />
            GitHub
          </Button>
          <Button
            variant="outline"
            render={<a href={DISCORD_INVITE} target="_blank" rel="noreferrer" />}
          >
            <DiscordLogoIcon weight="fill" />
            Discord
          </Button>
          <Button variant="outline" render={<a href={API_DOCS} target="_blank" rel="noreferrer" />}>
            <CodeIcon />
            {m.about_api_docs()}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
