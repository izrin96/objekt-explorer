import { DotsThreeIcon, LinkBreakIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import type { LinkedPreview } from "@repo/api/schemas/cosmo-link";
import { truncateAddress } from "@repo/lib/address";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type RefObject, useRef, useState } from "react";

import { CopyButton } from "@/components/shared/copy-button";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuSeparator, MenuTrigger } from "@/components/ui/menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toastManager } from "@/components/ui/toast";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { EditCosmoDialog } from "@/features/link/edit-cosmo-dialog";
import {
  ObjektPreviewCount,
  previewCardClass,
  previewCardLinkClass,
} from "@/features/objekt/objekt-preview-strip";
import { BannerThumb, bannerThumbFrameClass } from "@/features/profile/banner-thumb";
import { PROFILE_PAGE_KEY } from "@/features/profile/queries";
import { currentUserOptions } from "@/features/user/queries";
import { displayNickname, nicknameParam } from "@/lib/address";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export type LinkedProfile = { address: string; nickname: string | null };

/** `preview` is undefined while loading and null when it could not be read. */
export function LinkedCard({
  profile,
  preview,
}: {
  profile: LinkedProfile;
  preview: LinkedPreview | null | undefined;
}) {
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const nickname = displayNickname(profile.address, profile.nickname);
  const [editOpen, setEditOpen] = useState(false);
  const [unlinkOpen, setUnlinkOpen] = useState(false);

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
    <div
      className={previewCardClass}
      // a video banner plays only while hovered, so a grid of them stays still
      onPointerEnter={() => {
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          void videoRef.current?.play().catch(() => undefined);
        }
      }}
      onPointerLeave={() => videoRef.current?.pause()}
    >
      <LinkedCardHeader
        preview={preview}
        // an address has no initial worth showing, and a name may open with an emoji
        initial={profile.nickname ? Array.from(profile.nickname)[0] : undefined}
        videoRef={videoRef}
      />

      <div className="flex items-start gap-2 px-3.5 pt-3 pb-3.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <h2 className="font-display truncate text-base font-semibold">
            <Link
              to="/@{$nickname}"
              params={{ nickname: nicknameParam(profile.address, profile.nickname) }}
              className={previewCardLinkClass}
            >
              {nickname}
            </Link>
          </h2>

          <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
            <span className="relative z-10 flex min-w-0 items-center gap-1 font-mono">
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
            </span>
            <ObjektPreviewCount preview={preview} />
          </div>
        </div>

        <Menu>
          <MenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={m.link_more_actions()}
                className="relative z-10 -me-1.5 -mt-0.5 shrink-0"
              />
            }
          >
            <DotsThreeIcon weight="bold" />
          </MenuTrigger>
          <MenuPopup align="end" className="min-w-40">
            <MenuItem onClick={() => setEditOpen(true)}>
              <PencilSimpleIcon />
              {m.link_card_edit()}
            </MenuItem>
            <MenuSeparator />
            <MenuItem variant="destructive" onClick={() => setUnlinkOpen(true)}>
              <LinkBreakIcon />
              {m.link_card_unlink()}
            </MenuItem>
          </MenuPopup>
        </Menu>
      </div>

      {/* no unlink note here: it links to the page this card is on */}
      <EditCosmoDialog
        address={profile.address}
        showUnlinkNote={false}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <AlertDialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
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
  );
}

/** The banner, or a skeleton in its frame while the preview loads. */
function LinkedCardHeader({
  preview,
  initial,
  videoRef,
}: {
  preview: LinkedPreview | null | undefined;
  initial: string | undefined;
  videoRef: RefObject<HTMLVideoElement | null>;
}) {
  if (preview === undefined) {
    return <Skeleton className={cn(bannerThumbFrameClass, "rounded-none")} />;
  }

  return (
    <BannerThumb
      bannerImgUrl={preview?.bannerImgUrl}
      bannerImgType={preview?.bannerImgType}
      initial={initial}
      videoRef={videoRef}
    />
  );
}
