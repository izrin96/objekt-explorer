import { TrashSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
/** mirrors the app's `bannerImgUrl` / `bannerImgType` pair */
export type Banner = { url: string; type: string };

/**
 * An object URL is revoked only when this field replaces it with another pick,
 * never on unmount: `onChange` hands the URL to the caller, which outlives the
 * dialog.
 *
 * `id` must be unique per mounted field — the Upload button is a `<label>` for
 * the hidden file input.
 */
export function BannerField({
  id,
  banner,
  onChange,
}: {
  id: string;
  banner: Banner | null;
  onChange: (next: Banner | null) => void;
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
      <span className="text-muted-foreground text-xs">Recommended aspect ratio is 2.4:1.</span>
    </div>
  );
}
