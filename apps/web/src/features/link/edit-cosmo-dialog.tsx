import {
  ArrowCounterClockwiseIcon,
  TrashSimpleIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactElement, useRef, useState } from "react";
import { Cropper, type CropperRef } from "react-advanced-cropper";

import "react-advanced-cropper/dist/style.css";

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
import { Switch } from "@/components/ui/switch";
import { toastManager } from "@/components/ui/toast";
import {
  BANNER_ACCEPT,
  BANNER_ASPECT_RATIO,
  bannerFileError,
  cropToBanner,
  isCroppable,
  putBanner,
} from "@/features/link/banner-upload";
import { MessageMarkup } from "@/features/link/message-markup";
import { PROFILE_QUERY_KEY, profileOptions } from "@/features/link/queries";
import { currentUserOptions } from "@/features/user/queries";
import { client } from "@/lib/orpc";
import { SITE_NAME } from "@/lib/utils";
import { m } from "@/paraglide/messages";

type Profile = Awaited<ReturnType<typeof client.profile.find>>;
type FlagKey = "hideUser" | "hideNickname" | "privateSerial" | "hideTransfer" | "privateProfile";

const FLAGS: { key: FlagKey; label: () => string; description: () => string }[] = [
  {
    key: "hideUser",
    label: m.profile_edit_hide_user_label,
    description: () => m.profile_edit_hide_user_desc({ siteName: SITE_NAME }),
  },
  {
    key: "hideNickname",
    label: m.profile_edit_hide_nickname_label,
    description: m.profile_edit_hide_nickname_desc,
  },
  {
    key: "privateSerial",
    label: m.profile_edit_private_serial_label,
    description: m.profile_edit_private_serial_desc,
  },
  {
    key: "hideTransfer",
    label: m.profile_edit_hide_transfer_label,
    description: m.profile_edit_hide_transfer_desc,
  },
  {
    key: "privateProfile",
    label: m.profile_edit_private_profile_label,
    description: m.profile_edit_private_profile_desc,
  },
];

/** Owns its data, so a trigger only has to know the address. */
export function EditCosmoDialog({
  address,
  showUnlinkNote = true,
  children,
}: {
  address: string;
  /** a link to the page you are already on is noise */
  showUnlinkNote?: boolean;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const { data, error } = useQuery(profileOptions(address, open));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children} />
      <DialogPopup className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">{m.profile_edit_title()}</DialogTitle>
          <DialogDescription>
            <MessageMarkup
              parts={m.profile_edit_desc.parts()}
              markup={{
                nickname: () => (
                  <span className="text-foreground">{data?.nickname ?? address}</span>
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
                <p className="text-destructive-foreground text-sm">{error.message}</p>
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
  const [draft, setDraft] = useState(() => ({
    hideUser: profile.hideUser ?? false,
    hideNickname: profile.hideNickname ?? false,
    privateSerial: profile.privateSerial ?? false,
    hideTransfer: profile.hideTransfer ?? false,
    privateProfile: profile.privateProfile ?? false,
    gridColumns: profile.gridColumns ?? null,
  }));
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);

  const clearPick = () => {
    if (picked) URL.revokeObjectURL(picked.url);
    setPicked(null);
  };

  const save = useMutation({
    mutationFn: async () => {
      let bannerImgUrl: string | null | undefined;
      let bannerImgType: string | null | undefined;

      if (picked && !removeBanner) {
        const file = isCroppable(picked.file)
          ? await cropToBanner(cropperRef.current, picked.file)
          : picked.file;
        const { url, publicUrl } = await client.profile.getPresignedPost({
          address,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        });
        await putBanner(url, file);
        bannerImgUrl = publicUrl;
        bannerImgType = file.type;
      } else if (removeBanner) {
        bannerImgUrl = null;
        bannerImgType = null;
      }

      await client.profile.edit({ address, ...draft, bannerImgUrl, bannerImgType });
    },
    onSuccess: async () => {
      clearPick();
      onDone();
      toastManager.add({ type: "success", title: m.profile_edit_success() });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: currentUserOptions.queryKey }),
      ]);
    },
    onError: ({ message }) => {
      toastManager.add({ type: "error", title: m.profile_edit_error(), description: message });
    },
  });

  return (
    <>
      <DialogPanel className="flex flex-col gap-4">
        {FLAGS.map((flag) => (
          <Label
            key={flag.key}
            id={`edit-cosmo-${flag.key}-label`}
            htmlFor={`edit-cosmo-${flag.key}`}
            className="flex items-start justify-between gap-3 font-normal"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-sm font-medium">{flag.label()}</span>
              <span className="text-muted-foreground text-xs text-pretty">
                {flag.description()}
              </span>
            </span>
            <Switch
              id={`edit-cosmo-${flag.key}`}
              className="mt-0.5 shrink-0"
              checked={draft[flag.key]}
              onCheckedChange={(checked) => setDraft({ ...draft, [flag.key]: checked })}
            />
          </Label>
        ))}

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

          {picked && <BannerPreview file={picked.file} url={picked.url} cropperRef={cropperRef} />}

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
                  <Link to="/link" className="underline underline-offset-2">
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
        <Button loading={save.isPending} onClick={() => save.mutate()}>
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
}: {
  file: File;
  url: string;
  cropperRef: React.RefObject<CropperRef | null>;
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
        <div className="h-52 w-full">
          <Cropper ref={cropperRef} src={url} aspectRatio={() => BANNER_ASPECT_RATIO} />
        </div>
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
