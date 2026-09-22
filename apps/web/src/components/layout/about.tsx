import { DiscordLogoIcon, GithubLogoIcon } from "@phosphor-icons/react";

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

export const DISCORD_INVITE = "https://discord.gg/SWEm6RbJD3";
const GITHUB_REPO = "https://github.com/izrin96/objekt-explorer";

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
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
