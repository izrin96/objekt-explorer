import {
  ArrowCounterClockwiseIcon,
  TrashSimpleIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";
import { lazy, Suspense, useId, useRef } from "react";
import type { CropperRef } from "react-advanced-cropper";

import { MessageMarkup } from "@/components/shared/message-markup";
import { Button } from "@/components/ui/button";
import {
  FileUpload,
  FileUploadDropzone,
  type FileRejectReason,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import {
  Progress,
  ProgressIndicator,
  ProgressLabel,
  ProgressTrack,
  ProgressValue,
} from "@/components/ui/progress";
import { toastManager } from "@/components/ui/toast";
import { BANNER_ACCEPT, bannerFileError, isCroppable } from "@/features/link/banner-upload";
import { TONE_SOLID } from "@/lib/tone";
import { m } from "@/paraglide/messages";

import { type useBannerPick } from "./use-banner-pick";

const BannerCropper = lazy(() =>
  import("@/features/link/banner-cropper").then((mod) => ({ default: mod.BannerCropper })),
);

function useBatchedRejects() {
  // FileUpload reports each rejected file of a drop on its own, all in one pass: gather them
  // and show one toast per reason
  const rejectedRef = useRef<{ unsupported: File[]; extra: number } | null>(null);
  return (file: File, reason: FileRejectReason) => {
    if (rejectedRef.current === null) {
      const rejected = { unsupported: [] as File[], extra: 0 };
      rejectedRef.current = rejected;
      queueMicrotask(() => {
        rejectedRef.current = null;
        const [first, ...more] = rejected.unsupported;
        if (first) {
          toastManager.add({
            type: "error",
            title:
              more.length === 0
                ? m.profile_edit_file_unsupported({ name: first.name })
                : m.profile_edit_files_unsupported({ count: more.length + 1 }),
          });
        }
        if (rejected.extra > 0) {
          toastManager.add({ type: "info", title: m.profile_edit_banner_one_file() });
        }
      });
    }
    if (reason === "type") rejectedRef.current.unsupported.push(file);
    else rejectedRef.current.extra += 1;
  };
}

export function BannerField({
  banner,
  percent,
  saving,
  currentBannerUrl,
}: {
  banner: ReturnType<typeof useBannerPick>;
  percent: number | null;
  saving: boolean;
  currentBannerUrl: string | null | undefined;
}) {
  const { cropperRef, picked, setPicked, setCropReady, removeBanner, setRemoveBanner, clearPick } =
    banner;
  const bannerLabelId = useId();
  const bannerFieldRef = useRef<HTMLDivElement>(null);
  // the control that had focus unmounts on a pick or a Clear, so its replacement takes focus
  const focusOnMount = useRef(false);
  const takeFocus = (node: HTMLElement | null) => {
    if (node === null || !focusOnMount.current) return;
    focusOnMount.current = false;
    node.focus();
  };
  const rejectFile = useBatchedRejects();

  return (
    <>
      <div className="flex flex-col gap-2">
        <span id={bannerLabelId} className="text-sm font-medium">
          {m.profile_edit_banner_label()}
        </span>
        <FileUpload
          ref={bannerFieldRef}
          role="group"
          aria-labelledby={bannerLabelId}
          accept={BANNER_ACCEPT}
          disabled={saving}
          value={picked ? [picked.file] : []}
          onValueChange={([file]) => {
            // empty when Replace picked a file `accept` rejects; keep the current pick
            if (!file) return;
            const problem = bannerFileError(file);
            if (problem !== null) {
              toastManager.add({ type: "error", title: problem });
              return;
            }
            focusOnMount.current = picked === null;
            clearPick();
            setPicked({ file, url: URL.createObjectURL(file) });
            // a new banner replaces the old one, so it is no longer removed
            setRemoveBanner(false);
          }}
          onFileReject={rejectFile}
        >
          {picked ? (
            <div className="flex items-center gap-1.5">
              <FileUploadTrigger ref={takeFocus} size="sm">
                <UploadSimpleIcon />
                {m.profile_edit_banner_replace()}
              </FileUploadTrigger>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  focusOnMount.current = true;
                  clearPick();
                }}
              >
                {m.profile_edit_banner_clear()}
              </Button>
            </div>
          ) : (
            <FileUploadDropzone ref={takeFocus} className="hover:bg-muted/50 rounded-lg py-6">
              <div className="bg-background flex size-9 items-center justify-center rounded-full border">
                <UploadSimpleIcon aria-hidden className="size-4 opacity-72" />
              </div>
              <p className="text-sm font-medium text-balance">
                <MessageMarkup
                  parts={m.profile_edit_banner_drop.parts()}
                  markup={{
                    browse: (children) => (
                      <span className="underline underline-offset-4">{children}</span>
                    ),
                  }}
                />
              </p>
            </FileUploadDropzone>
          )}
        </FileUpload>

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
              // the failure lands late: take focus back only if it sat on Replace or Clear
              focusOnMount.current =
                bannerFieldRef.current?.contains(document.activeElement) === true;
              clearPick();
            }}
          />
        )}

        {percent !== null && <ConvertProgress percent={percent} />}

        <span className="text-muted-foreground text-xs">
          {m.profile_edit_banner_recommendation()}
        </span>
      </div>

      {currentBannerUrl && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{m.profile_edit_remove_banner_label()}</span>
          <div className="flex items-center gap-3">
            <img
              src={currentBannerUrl}
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  clearPick();
                  setRemoveBanner(true);
                }}
              >
                <TrashSimpleIcon />
                {m.common_actions_remove()}
              </Button>
            )}
          </div>
        </div>
      )}
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
    <Progress value={percent} className="flex-row items-center">
      <ProgressTrack className="bg-muted h-1 flex-1">
        <ProgressIndicator className={TONE_SOLID.progress} />
      </ProgressTrack>
      <span className="text-muted-foreground text-xs">
        <ProgressLabel className="text-xs font-normal">
          {m.profile_edit_banner_converting()}
        </ProgressLabel>{" "}
        <ProgressValue className="text-xs" />
      </span>
    </Progress>
  );
}
