import {
  ArrowCounterClockwiseIcon,
  TrashSimpleIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { lazy, type ReactElement, Suspense, useEffect, useRef, useState } from "react";
import type { CropperRef } from "react-advanced-cropper";

import { MessageMarkup } from "@/components/shared/message-markup";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toastManager } from "@/components/ui/toast";
import {
  BANNER_ACCEPT,
  bannerFileError,
  isCroppable,
  isUploadFailure,
  prepareBanner,
  putBanner,
  refusalMessage,
} from "@/features/link/banner-upload";
import { PROFILE_QUERY_KEY, profileOptions } from "@/features/link/queries";
import { PROFILE_PAGE_KEY } from "@/features/profile/queries";
import { currentUserOptions } from "@/features/user/queries";
import { displayNickname } from "@/lib/address";
import { client, orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { TONE_SOLID } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

type Profile = Awaited<ReturnType<typeof client.profile.find>>;
const BannerCropper = lazy(() =>
  import("@/features/link/banner-cropper").then((mod) => ({ default: mod.BannerCropper })),
);

/**
 * Owns its data, so a caller only has to know the address. It opens from
 * `children` as its trigger, or from `open` when a menu item controls it.
 */
export function EditCosmoDialog({
  address,
  showUnlinkNote = true,
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  address: string;
  /** a link to the page you are already on is noise */
  showUnlinkNote?: boolean;
} & (
  | { children: ReactElement; open?: never; onOpenChange?: never }
  | { children?: never; open: boolean; onOpenChange: (open: boolean) => void }
)) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  const { data, error } = useQuery(profileOptions(address, open));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? <DialogTrigger render={children} /> : null}
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{m.profile_edit_title()}</DialogTitle>
          <DialogDescription>
            <MessageMarkup
              parts={m.profile_edit_desc.parts()}
              markup={{
                nickname: () => (
                  <span className="text-foreground">
                    {displayNickname(address, data?.nickname)}
                  </span>
                ),
              }}
            />
          </DialogDescription>
        </DialogHeader>
        {data ? (
          <EditForm
            address={address}
            profile={data}
            showUnlinkNote={showUnlinkNote}
            onDone={() => setOpen(false)}
          />
        ) : (
          <>
            <DialogPanel>
              {error ? (
                <p className="text-destructive-foreground text-sm">{refusalText(error)}</p>
              ) : (
                <div className="flex justify-center py-6">
                  <Spinner className="size-5" />
                </div>
              )}
            </DialogPanel>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {m.common_modal_cancel()}
              </DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogPopup>
    </Dialog>
  );
}

function EditForm({
  address,
  profile,
  showUnlinkNote,
  onDone,
}: {
  address: string;
  profile: Profile;
  showUnlinkNote: boolean;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const cropperRef = useRef<CropperRef>(null);
  const saveRef = useRef<AbortController | null>(null);
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [cropReady, setCropReady] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);

  useEffect(() => () => saveRef.current?.abort(), []);

  const clearPick = () => {
    saveRef.current?.abort();
    if (picked) URL.revokeObjectURL(picked.url);
    setPicked(null);
    setCropReady(false);
  };

  const awaitingCrop = picked !== null && !removeBanner && isCroppable(picked.file) && !cropReady;

  const save = useMutation({
    mutationFn: async () => {
      const controller = new AbortController();
      saveRef.current = controller;
      const { signal } = controller;
      let bannerImgUrl: string | null | undefined;
      let bannerImgType: string | null | undefined;

      if (picked && !removeBanner) {
        const file = await prepareBanner(picked.file, {
          cropper: cropperRef.current,
          signal,
          // a whole percent, so a frame that moves nothing re-renders nothing
          onProgress: (progress) => setPercent(Math.floor(progress * 100)),
        }).finally(() => setPercent(null));
        signal.throwIfAborted();
        const { url, publicUrl } = await client.profile.getPresignedPost({
          address,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        });
        signal.throwIfAborted();
        await putBanner(url, file, signal).catch((error: unknown) => {
          throw signal.aborted ? signal.reason : error;
        });
        bannerImgUrl = publicUrl;
        bannerImgType = file.type;
      } else if (removeBanner) {
        bannerImgUrl = null;
        bannerImgType = null;
      }

      signal.throwIfAborted();
      await client.profile.edit({
        address,
        gridColumns: profile.gridColumns ?? null,
        bannerImgUrl,
        bannerImgType,
      });
    },
    onSuccess: async () => {
      clearPick();
      onDone();
      toastManager.add({ type: "success", title: m.profile_edit_success() });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: PROFILE_PAGE_KEY }),
        queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey }),
        queryClient.invalidateQueries({ queryKey: orpc.cosmoLink.linkedPreviews.key() }),
      ]);
    },
    onError: (error) => {
      // the dialog closed or the pick changed mid-save
      if (error.name === "AbortError") return;
      const refused = refusalMessage(error);
      if (refused !== null) {
        toastManager.add({ type: "error", title: refused });
        return;
      }
      toastManager.add({
        type: "error",
        title: m.profile_edit_error(),
        description: isUploadFailure(error) ? m.profile_edit_upload_error() : refusalText(error),
      });
    },
  });

  return (
    <>
      <DialogPanel className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-cosmo-banner">{m.profile_edit_banner_label()}</Label>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              render={<label htmlFor="edit-cosmo-banner" className="cursor-pointer" />}
            >
              <UploadSimpleIcon />
              {m.profile_edit_banner_label()}
            </Button>
            <input
              id="edit-cosmo-banner"
              type="file"
              accept={BANNER_ACCEPT}
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                const problem = bannerFileError(file);
                if (problem !== null) {
                  toastManager.add({ type: "error", title: problem });
                  return;
                }
                clearPick();
                setPicked({ file, url: URL.createObjectURL(file) });
              }}
            />
            {picked && (
              <Button variant="outline" size="sm" onClick={clearPick}>
                {m.profile_edit_banner_clear()}
              </Button>
            )}
          </div>

          {picked && (
            <BannerPreview
              // a new pick remounts the cropper, so its onReady fires again
              key={picked.url}
              file={picked.file}
              url={picked.url}
              cropperRef={cropperRef}
              onCropReady={() => setCropReady(true)}
              onCropError={() => {
                toastManager.add({
                  type: "error",
                  title: m.profile_edit_file_unsupported({ name: picked.file.name }),
                });
                clearPick();
              }}
            />
          )}

          {percent !== null && <ConvertProgress percent={percent} />}

          <span className="text-muted-foreground text-xs">
            {m.profile_edit_banner_recommendation()}
          </span>
        </div>

        {profile.bannerImgUrl && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">{m.profile_edit_remove_banner_label()}</span>
            <div className="flex items-center gap-3">
              <img
                src={profile.bannerImgUrl}
                alt=""
                className={
                  removeBanner
                    ? "aspect-banner w-32 rounded-lg object-cover opacity-40"
                    : "aspect-banner w-32 rounded-lg object-cover"
                }
              />
              {removeBanner ? (
                <Button variant="outline" size="sm" onClick={() => setRemoveBanner(false)}>
                  <ArrowCounterClockwiseIcon />
                  {m.common_actions_undo()}
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setRemoveBanner(true)}>
                  <TrashSimpleIcon />
                  {m.common_actions_remove()}
                </Button>
              )}
            </div>
          </div>
        )}

        {showUnlinkNote && (
          <span className="text-muted-foreground text-xs text-pretty">
            <MessageMarkup
              parts={m.profile_edit_unlink_note.parts()}
              markup={{
                link: (children) => (
                  <Link to="/account/profiles" className="underline underline-offset-2">
                    {children}
                  </Link>
                ),
              }}
            />
          </span>
        )}
      </DialogPanel>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>{m.common_modal_cancel()}</DialogClose>
        <Button loading={save.isPending} disabled={awaitingCrop} onClick={() => save.mutate()}>
          {m.profile_edit_submit()}
        </Button>
      </DialogFooter>
    </>
  );
}

function BannerPreview({
  file,
  url,
  cropperRef,
  onCropReady,
  onCropError,
}: {
  file: File;
  url: string;
  cropperRef: React.RefObject<CropperRef | null>;
  onCropReady: () => void;
  onCropError: () => void;
}) {
  return (
    <>
      {file.type.startsWith("video") ? (
        <video
          className="aspect-banner w-full rounded-lg object-cover object-center"
          src={url}
          autoPlay
          loop
          muted
          playsInline
        />
      ) : isCroppable(file) ? (
        <Suspense fallback={<div className="h-52 w-full" />}>
          <BannerCropper
            url={url}
            cropperRef={cropperRef}
            onReady={onCropReady}
            onError={onCropError}
          />
        </Suspense>
      ) : (
        <img
          src={url}
          alt=""
          className="aspect-banner w-full rounded-lg object-cover object-center"
        />
      )}
      <span className="text-muted-foreground truncate text-xs">
        {m.profile_edit_banner_selected({ name: file.name })}
      </span>
    </>
  );
}

function ConvertProgress({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-label={m.profile_edit_banner_converting()}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="bg-muted h-1 flex-1 overflow-hidden rounded-full"
      >
        <div className={cn("h-full", TONE_SOLID.progress)} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-muted-foreground text-xs">
        {m.profile_edit_banner_converting()}{" "}
        <span className="font-mono tabular-nums">{percent}%</span>
      </span>
    </div>
  );
}
