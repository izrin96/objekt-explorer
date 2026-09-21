import type { PublicProfile } from "@repo/api/schemas/user";

import { ApolloIcon } from "@/components/shared/apollo-icon";
import { CopyButton } from "@/components/shared/copy-button";
import { SocialBadge } from "@/components/shared/social-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { EditCosmoDialog } from "@/features/link/edit-cosmo-dialog";
import { truncateAddress } from "@/lib/address";
import { m } from "@/paraglide/messages";

import { ProfileBanner } from "./profile-banner";
import { useProfileAuthed } from "./profile-provider";

export function ProfileHeader({ profile }: { profile: PublicProfile }) {
  const isProfileAuthed = useProfileAuthed();
  const nickname = profile.nickname ?? truncateAddress(profile.address);
  const hasBanner = Boolean(profile.bannerImgUrl && profile.bannerImgType);

  return (
    <div className={hasBanner ? "relative" : "relative max-md:pt-5"}>
      <ProfileBanner profile={profile} />

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-end gap-3.5">
          <Avatar className="border-background size-16 border-3">
            {profile.user?.image && <AvatarImage src={profile.user.image} alt="" />}
            <AvatarFallback className="text-base font-semibold">
              {nickname.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="font-display flex items-center gap-2 text-[22px] font-semibold tracking-tight">
              <span className="truncate">{nickname}</span>
              {profile.verified === true && (
                <Badge variant="success" className="font-semibold tracking-wide">
                  {m.profile_header_verified()}
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
              <CopyButton
                text={profile.address}
                label={m.common_copy_button()}
                toastTitle={m.profile_header_address_copied()}
              />
            </div>
            {profile.user && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {profile.user.name && <SocialBadge platform="cosmo" username={profile.user.name} />}
                {profile.user.discord && (
                  <SocialBadge platform="discord" username={profile.user.discord} />
                )}
                {profile.user.twitter && (
                  <SocialBadge platform="twitter" username={profile.user.twitter} />
                )}
              </div>
            )}
          </div>
        </div>

        {/* below `md` this wraps onto its own line under the identity rather
            than competing with it for the row */}
        <div className="flex flex-wrap gap-1.5 max-md:w-full">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={m.profile_header_view_in_apollo()}
                  render={
                    <a
                      href={`https://apollo.cafe/@${profile.nickname ?? profile.address}`}
                      target="_blank"
                      rel="noreferrer"
                    />
                  }
                />
              }
            >
              <ApolloIcon className="size-4" />
            </TooltipTrigger>
            <TooltipPopup>{m.profile_header_view_in_apollo()}</TooltipPopup>
          </Tooltip>

          {isProfileAuthed && (
            <EditCosmoDialog address={profile.address}>
              <Button size="sm">{m.profile_header_edit_profile()}</Button>
            </EditCosmoDialog>
          )}
        </div>
      </div>
    </div>
  );
}
