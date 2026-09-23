import { TrashSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { LabBanner } from "@/fixtures/banners";

/**
 * Banner preview + upload / remove for the one Cosmo edit dialog — the app
 * drives the banner from a `bannerImgUrl` / `bannerImgType` pair.
 *
 * An object URL is revoked only when this field replaces it with another pick.
 * It is not revoked on unmount: `onChange` hands the URL to the caller, which
 * saves it into the link store, and the dialog unmounts on Save — revoking
 * there broke the banner the profile header had just been given.
 *
 * `id` must be unique per mounted field: the Upload button is a `<label>` for
 * the hidden file input.
 */
export function BannerField({
  id,
  banner,
  onChange,
}: {
  id: string;
  banner: LabBanner | null;
  onChange: (next: LabBanner | null) => void;
}) {
  const objectUrl = useRef<string | null>(null);

  const pick = (file: File | undefined) => {
    if (!file) return;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const url = URL.createObjectURL(file);
    objectUrl.current = url;
    onChange({ url, type: file.type });
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>Banner</Label>
      <div className="bg-muted aspect-banner w-full overflow-hidden rounded-lg border">
        {banner ? (
          banner.type.startsWith("video") ? (
            <video
              className="size-full object-cover object-center"
              src={banner.url}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img src={banner.url} alt="" className="size-full object-cover object-center" />
          )
        ) : (
          <div className="text-muted-foreground grid size-full place-items-center text-xs">
            No banner
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          render={<label htmlFor={id} className="cursor-pointer" />}
        >
          <UploadSimpleIcon />
          Upload
        </Button>
        <input
          id={id}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          onChange={(e) => pick(e.target.files?.[0])}
        />
        <Button variant="outline" size="sm" disabled={!banner} onClick={() => onChange(null)}>
          <TrashSimpleIcon />
          Remove
        </Button>
      </div>
      <span className="text-muted-foreground text-xs">
        Recommended aspect ratio is 2.4:1. The real app crops stills with react-advanced-cropper;
        the lab keeps the file as-is.
      </span>
    </div>
  );
}
