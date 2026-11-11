import { BIO_MAX_LENGTH } from "@repo/api/schemas/profile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactElement, useEffect, useId, useRef, useState } from "react";

import { DialogLoadPanel } from "@/components/shared/dialog-load-panel";
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
import { Textarea } from "@/components/ui/textarea";
import { toastManager } from "@/components/ui/toast";
import { BannerField } from "@/features/link/banner-field";
import {
  isUploadFailure,
  prepareBanner,
  putBanner,
  refusalMessage,
} from "@/features/link/banner-upload";
import { PROFILE_QUERY_KEY, invalidateLinkChange, profileOptions } from "@/features/link/queries";
import { useBannerPick } from "@/features/link/use-banner-pick";
import { displayNickname } from "@/lib/address";
import { formatCount } from "@/lib/number";
import { client, orpc } from "@/lib/orpc";
import { refusalText } from "@/lib/refusal";
import { m } from "@/paraglide/messages";

type Profile = Awaited<ReturnType<typeof client.profile.find>>;

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
            <DialogLoadPanel error={error} />
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
  const saveRef = useRef<AbortController | null>(null);
  const [percent, setPercent] = useState<number | null>(null);
  // an untouched bio is not sent, so a stale copy can't overwrite one saved from another tab;
  // the check reads what the form opened with, since a refetch replaces `profile`
  const [initialBio] = useState(profile.bio ?? "");
  const [bio, setBio] = useState(initialBio);
  const bioId = useId();
  const banner = useBannerPick(saveRef);
  const { cropperRef, picked, removeBanner, clearPick, awaitingCrop } = banner;

  useEffect(() => () => saveRef.current?.abort(), []);

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
        bio: bio === initialBio ? undefined : bio,
      });
    },
    onSuccess: async () => {
      clearPick();
      onDone();
      toastManager.add({ type: "success", title: m.profile_edit_success() });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
        invalidateLinkChange(queryClient),
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
        <BannerField
          banner={banner}
          percent={percent}
          saving={save.isPending}
          currentBannerUrl={profile.bannerImgUrl}
        />

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${bioId}-field`}>{m.profile_edit_bio_label()}</Label>
          <Textarea
            id={`${bioId}-field`}
            value={bio}
            maxLength={BIO_MAX_LENGTH}
            disabled={save.isPending}
            aria-describedby={`${bioId}-hint`}
            onChange={(event) => setBio(event.target.value)}
            placeholder={m.profile_edit_bio_placeholder()}
          />
          <div className="flex items-start justify-between gap-3">
            <span id={`${bioId}-hint`} className="text-muted-foreground text-xs text-pretty">
              {m.profile_edit_bio_hint()}
            </span>
            {/* in the tree throughout, but silent until the bio nears the limit */}
            <p aria-live="polite" className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {bio.length >= BIO_MAX_LENGTH - 30
                ? m.chat_counter({
                    count: formatCount(bio.length),
                    max: formatCount(BIO_MAX_LENGTH),
                  })
                : null}
            </p>
          </div>
        </div>

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
