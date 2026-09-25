import { LinkBreakIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { CopyButton } from "@/components/shared/copy-button";
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
import { Button } from "@/components/ui/button";
import { toastManager } from "@/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { EditCosmoDialog } from "@/features/link/edit-cosmo-dialog";
import { PROFILE_PAGE_KEY } from "@/features/profile/queries";
import { currentUserOptions } from "@/features/user/queries";
import { truncateAddress } from "@/lib/address";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export type LinkedProfile = { address: string; nickname: string | null };

export function LinkedCard({ profile }: { profile: LinkedProfile }) {
  const queryClient = useQueryClient();
  const nickname = profile.nickname ?? truncateAddress(profile.address);

  const removeLink = useMutation(
    orpc.cosmoLink.removeLink.mutationOptions({
      onSuccess: async () => {
        toastManager.add({ type: "success", title: m.link_unlink_success() });
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey }),
          queryClient.invalidateQueries({ queryKey: PROFILE_PAGE_KEY }),
        ]);
      },
      onError: ({ message }) => {
        toastManager.add({ type: "error", title: m.link_unlink_error(), description: message });
      },
    }),
  );

  return (
    <div className="bg-card flex items-start justify-between gap-3 rounded-lg border p-4">
      <div className="flex min-w-0 flex-col gap-1">
        {/* only the title navigates; the card stays inert so the buttons read */}
        <Link
          to="/@{$nickname}"
          params={{ nickname: profile.nickname ?? profile.address.toLowerCase() }}
          className="font-display w-fit max-w-full truncate font-semibold underline-offset-2 hover:underline"
        >
          {nickname}
        </Link>
        <div className="text-muted-foreground flex min-w-0 items-center gap-1 font-mono text-xs">
          <Tooltip>
            <TooltipTrigger render={<span className="min-w-0 truncate" />}>
              {truncateAddress(profile.address)}
            </TooltipTrigger>
            <TooltipPopup className="font-mono">{profile.address}</TooltipPopup>
          </Tooltip>
          <CopyButton
            text={profile.address}
            label={m.common_copy_button()}
            toastTitle={m.common_copy_copied()}
          />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <Tooltip>
          {/* no unlink note here: it links to the page this card is on */}
          <EditCosmoDialog address={profile.address} showUnlinkNote={false}>
            <TooltipTrigger
              render={<Button variant="outline" size="icon-xs" aria-label={m.link_card_edit()} />}
            >
              <PencilSimpleIcon />
            </TooltipTrigger>
          </EditCosmoDialog>
          <TooltipPopup>{m.link_card_edit()}</TooltipPopup>
        </Tooltip>

        <AlertDialog>
          <Tooltip>
            <AlertDialogTrigger
              render={
                <TooltipTrigger
                  render={
                    <Button
                      variant="destructive-outline"
                      size="icon-xs"
                      aria-label={m.link_card_unlink()}
                    />
                  }
                />
              }
            >
              <LinkBreakIcon />
            </AlertDialogTrigger>
            <TooltipPopup>{m.link_card_unlink()}</TooltipPopup>
          </Tooltip>
          <AlertDialogPopup className="max-w-sm">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">{m.link_unlink_title()}</AlertDialogTitle>
              <AlertDialogDescription>{m.link_unlink_description()}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogClose render={<Button variant="outline" />}>
                {m.common_modal_cancel()}
              </AlertDialogClose>
              <AlertDialogClose
                render={<Button variant="destructive" />}
                onClick={() => removeLink.mutate(profile.address)}
              >
                {m.link_unlink_submit()}
              </AlertDialogClose>
            </AlertDialogFooter>
          </AlertDialogPopup>
        </AlertDialog>
      </div>
    </div>
  );
}
