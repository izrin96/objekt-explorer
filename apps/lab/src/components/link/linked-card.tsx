import { LinkBreakIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { EditCosmoDialog } from "@/components/link/edit-cosmo-dialog";
import { CopyButton } from "@/components/shared/copy-button";
import { TimeAgo } from "@/components/shared/time-ago";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { truncateAddress } from "@/lib/address";
import { type CosmoLink, useCosmoLinks } from "@/store/link";

/** the flags worth surfacing on the card, in the order the dialog lists them */
const BADGES: { key: keyof CosmoLink; label: string }[] = [
  { key: "hideUser", label: "hidden" },
  { key: "privateSerial", label: "private serials" },
  { key: "privateProfile", label: "private" },
];

/** Port of `components/link/my-link.tsx`'s LinkCard, with explicit buttons. */
export function LinkedCard({ link }: { link: CosmoLink }) {
  const remove = useCosmoLinks((s) => s.remove);
  const flags = BADGES.filter((badge) => link[badge.key] === true);

  return (
    <div className="bg-card flex items-start justify-between gap-3 rounded-lg border p-4">
      <div className="flex min-w-0 flex-col gap-1">
        {/* only the title navigates; the card stays inert so the buttons read */}
        <Link
          to="/profile/$nickname"
          params={{ nickname: link.nickname }}
          className="font-display w-fit max-w-full truncate font-semibold underline-offset-2 hover:underline"
        >
          {link.nickname}
        </Link>
        {/* short form, same as the profile header: the full address is 42 chars
            and pushed the Edit / unlink buttons off the card on a phone */}
        <div className="text-muted-foreground flex min-w-0 items-center gap-1 font-mono text-xs">
          <Tooltip>
            <TooltipTrigger render={<span className="min-w-0 truncate" />}>
              {truncateAddress(link.address)}
            </TooltipTrigger>
            <TooltipPopup className="font-mono">{link.address}</TooltipPopup>
          </Tooltip>
          <CopyButton text={link.address} label="Copy address" toastTitle="Address copied" />
        </div>
        <div className="text-muted-foreground text-xs">
          Linked <TimeAgo date={link.linkedAt} />
        </div>
        {flags.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-1">
            {flags.map((flag) => (
              <Badge key={flag.key} variant="secondary" size="sm" className="font-normal">
                {flag.label}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Tooltip>
          {/* no unlink note here: it links to the page this card is on */}
          <EditCosmoDialog link={link} showUnlinkNote={false}>
            <TooltipTrigger
              render={<Button variant="outline" size="icon-xs" aria-label="Edit Cosmo profile" />}
            >
              <PencilSimpleIcon />
            </TooltipTrigger>
          </EditCosmoDialog>
          <TooltipPopup>Edit</TooltipPopup>
        </Tooltip>

        <AlertDialog>
          <Tooltip>
            <AlertDialogTrigger
              render={
                <TooltipTrigger
                  render={
                    <Button variant="destructive-outline" size="icon-xs" aria-label="Unlink" />
                  }
                />
              }
            >
              <LinkBreakIcon />
            </AlertDialogTrigger>
            <TooltipPopup>Unlink</TooltipPopup>
          </Tooltip>
          <AlertDialogPopup className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Unlink Cosmo</AlertDialogTitle>
              <AlertDialogDescription>
                This unlinks <span className="text-foreground">{link.nickname}</span> from this
                account. You can link it again later. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="outline" />}>Cancel</AlertDialogClose>
              <AlertDialogClose
                render={<Button variant="destructive" />}
                onClick={() => {
                  remove(link.address);
                  toastManager.add({ type: "success", title: "Cosmo unlinked" });
                }}
              >
                Unlink
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </div>
    </div>
  );
}
