import { TrashIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { When } from "@/features/moderation/console/when";
import { BannerThumb } from "@/features/profile/banner-thumb";
import { nicknameParam } from "@/lib/address";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";

import { RemoveBannerForm } from "./remove-banner-form";
import { type Banner, profileName } from "./shared";
import { TileVideo } from "./tile-video";

export function BannerTile({
  banner,
  removing,
  onRemove,
  onClose,
}: {
  banner: Banner;
  removing: boolean;
  onRemove: () => void;
  onClose: () => void;
}) {
  const removeButton = useRef<HTMLButtonElement>(null);
  const name = profileName(banner);

  return (
    <li className="flex min-w-0 flex-col gap-2">
      {banner.bannerImgType?.startsWith("video") ? (
        <TileVideo banner={banner} name={name} />
      ) : (
        <div className="overflow-hidden rounded-lg border *:border-b-0">
          <BannerThumb bannerImgUrl={banner.bannerImgUrl} bannerImgType={banner.bannerImgType} />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            to="/@{$nickname}"
            params={{ nickname: nicknameParam(banner.address, banner.nickname) }}
            className={cn(
              "truncate text-sm font-medium hover:underline",
              banner.nickname === null && "font-mono",
            )}
          >
            {name}
          </Link>
          <span className="text-muted-foreground text-xs text-pretty">
            {banner.updatedAt ? (
              <When iso={banner.updatedAt} className="tabular-nums" />
            ) : (
              m.mod_banners_time_unknown()
            )}
            {" · "}
            {banner.holder ? (
              <Link
                to="/mod/reports/$userId"
                params={{ userId: banner.holder.userId }}
                className="hover:text-foreground underline-offset-2 hover:underline"
              >
                {m.mod_banners_account({
                  name: banner.holder.identity?.name ?? m.mod_person_gone(),
                })}
              </Link>
            ) : (
              m.mod_banners_no_account()
            )}
          </span>
        </div>
        {banner.canRemove && !removing ? (
          <Button
            ref={removeButton}
            size="xs"
            variant="destructive-outline"
            aria-label={m.mod_banners_remove_label({ profile: name })}
            onClick={onRemove}
          >
            <TrashIcon />
            {m.mod_banners_remove()}
          </Button>
        ) : null}
      </div>
      {removing ? (
        <RemoveBannerForm
          banner={banner}
          onClose={() => {
            onClose();
            // the button comes back on the next render
            requestAnimationFrame(() => removeButton.current?.focus());
          }}
          onRemoved={onClose}
        />
      ) : null}
    </li>
  );
}
