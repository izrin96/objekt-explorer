import {
  DiscordLogoIcon,
  EyeIcon,
  EyeSlashIcon,
  LinkIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { EditCosmoDialog } from "@/components/link/edit-cosmo-dialog";
import { ProfileBanner, useBannerMedia } from "@/components/profile/profile-banner";
import type { Profile } from "@/components/profile/profile-data";
import { ApolloIcon } from "@/components/shared/apollo-icon";
import { CopyButton } from "@/components/shared/copy-button";
import { notImplemented } from "@/components/shared/not-implemented";
import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { truncateAddress } from "@/lib/address";
import { readFlag, writeFlag } from "@/lib/local-storage";
import { cn } from "@/lib/utils";
import { useAccount } from "@/store/account";
import { useCosmoLinks } from "@/store/link";

/** applies to every profile, and survives a reload */
const HIDE_BANNER_KEY = "lab:hideBanner";

/** Port of `.banner` + `.identity` from the mockup, now with a real banner. */
export function ProfileHeader({ profile }: { profile: Profile }) {
  const linked = useCosmoLinks((s) => s.links);
  const account = useAccount((s) => s.account);
  const fixtureBanner = useBannerMedia(profile.bannerKind, profile.bannerSeed);
  // read lazily: a blocked localStorage must not take the profile down
  const [hidden, setHidden] = useState(() => readFlag(HIDE_BANNER_KEY));

  // the one edit dialog writes the banner into the link store, so a save from
  // either this header or the `/link` card shows up in both
  const link = linked.find((l) => l.nickname === profile.nickname);
  const isLinked = link !== undefined;
  // `undefined` is "never edited" (keep the fixture); `null` is "removed"
  const media = link?.banner === undefined ? fixtureBanner : link.banner;

  const toggleBanner = () => {
    setHidden((prev) => {
      writeFlag(HIDE_BANNER_KEY, !prev);
      return !prev;
    });
  };

  // with no banner box above it (none set, or hidden) the identity would start
  // at the main padding, 20px under the nav; on a phone that reads as crowded
  const hasBannerBox = media !== null && !hidden;

  return (
    <div className={cn("relative", !hasBannerBox && "max-md:pt-5")}>
      <ProfileBanner banner={media} hidden={hidden} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-end gap-3.5">
          <Avatar className="border-background size-16 border-3">
            <AvatarFallback className="bg-linear-to-br from-[#d8b4a0] to-[#8c5a4a]" />
          </Avatar>
          <div className="min-w-0">
            <h1 className="font-display flex items-center gap-2 text-[22px] font-semibold tracking-tight">
              {profile.nickname}
              {profile.verified && (
                <Badge variant="success" className="font-semibold tracking-wide">
                  Verified
                </Badge>
              )}
            </h1>
            <div className="text-muted-foreground flex items-center gap-1.5 font-mono text-xs">
              <Tooltip>
                <TooltipTrigger render={<span className="max-w-[26ch] truncate" />}>
                  {truncateAddress(profile.address)}
                </TooltipTrigger>
                <TooltipPopup className="font-mono">{profile.address}</TooltipPopup>
              </Tooltip>
              <CopyButton text={profile.address} label="Copy address" toastTitle="Address copied" />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {profile.socials.map((s) => (
                <SocialBadge
                  key={s.platform}
                  platform={s.platform}
                  /* the first chip names the site account behind this Cosmo;
                     on one of our own it is the live account row, so renaming
                     in the Account dialog shows up here too */
                  username={s.platform === "cosmo" && isLinked ? account.name : s.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* below `md` this wraps onto its own line under the identity rather
            than competing with it for the row */}
        <div className="flex flex-wrap gap-1.5 max-md:w-full">
          {/* lives next to the identity block, not on the banner, so it stays
              reachable once the banner is hidden */}
          {media !== null && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-sm"
                    aria-label={hidden ? "Show banner" : "Hide banner"}
                    onClick={toggleBanner}
                  />
                }
              >
                {hidden ? <EyeIcon /> : <EyeSlashIcon />}
              </TooltipTrigger>
              <TooltipPopup>{hidden ? "Show banner" : "Hide banner"}</TooltipPopup>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="View in Apollo"
                  render={
                    <a
                      href={`https://apollo.cafe/@${profile.nickname || profile.address}`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                />
              }
            >
              <ApolloIcon className="size-4" />
            </TooltipTrigger>
            <TooltipPopup>View in Apollo</TooltipPopup>
          </Tooltip>
          {!isLinked && (
            <Button variant="outline" size="sm" render={<Link to="/link" />}>
              <LinkIcon />
              Link this Cosmo
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => notImplemented({ title: "Copied Discord format" })}
          >
            <DiscordLogoIcon weight="fill" className="text-discord" />
            Discord format
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              notImplemented({
                title: "Link copied",
                description: `/profile/${profile.nickname}`,
              })
            }
          >
            <ShareNetworkIcon />
            Share
          </Button>
          {/* the app gates this on `isProfileAuthed`; the lab's stand-in is
              "this Cosmo is linked to the signed-in account" */}
          {link && (
            <EditCosmoDialog link={link} fallbackBanner={fixtureBanner}>
              <Button size="sm">Edit profile</Button>
            </EditCosmoDialog>
          )}
        </div>
      </div>
    </div>
  );
}
