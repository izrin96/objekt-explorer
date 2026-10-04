import { LockSimpleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, useEffect, useRef } from "react";

import { CursorCard, cursorCardDelays } from "@/components/shared/cursor-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipPrimitive } from "@/components/ui/tooltip";
import { displayNickname, truncateAddress } from "@/lib/address";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";
import { m } from "@/paraglide/messages";
import { useSettings } from "@/stores/settings";

import { BannerThumb } from "./banner-thumb";

type Payload = { address: string; nickname: string | null | undefined };

const profileCardHandle = TooltipPrimitive.createHandle<Payload>();

function profileParams(address: string, nickname: string | null | undefined) {
  return { nickname: nickname ?? address.toLowerCase() };
}

/** A link to a profile that shows its hover card while a mouse rests on it. */
export function ProfileLink({
  address,
  nickname,
  className,
  onClick,
  children,
}: {
  address: string;
  nickname: string | null | undefined;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <TooltipPrimitive.Trigger
      handle={profileCardHandle}
      payload={{ address, nickname }}
      {...cursorCardDelays}
      render={
        <Link
          to="/@{$nickname}"
          params={profileParams(address, nickname)}
          className={className}
          onClick={onClick}
        />
      }
    >
      {children}
    </TooltipPrimitive.Trigger>
  );
}

/** A table cell that shows the profile's hover card anywhere inside it, while only the name links. */
export function ProfileCell({
  address,
  nickname,
  className,
  linkClassName,
  onClick,
  before,
  after,
  children,
}: {
  address: string;
  nickname: string | null | undefined;
  className?: string;
  linkClassName?: string;
  onClick?: () => void;
  /** content ahead of the name, inside the hover area */
  before?: ReactNode;
  /** content after the name, inside the hover area */
  after?: ReactNode;
  children: ReactNode;
}) {
  return (
    <TooltipPrimitive.Trigger
      handle={profileCardHandle}
      payload={{ address, nickname }}
      {...cursorCardDelays}
      render={<span className={className} />}
    >
      {before}
      <Link
        to="/@{$nickname}"
        params={profileParams(address, nickname)}
        className={linkClassName}
        onClick={onClick}
      >
        {children}
      </Link>
      {after}
    </TooltipPrimitive.Trigger>
  );
}

/** Mounted once at the root. */
export function ProfileHoverCard() {
  return (
    <CursorCard handle={profileCardHandle} className="w-72">
      {(payload) => <CardBody key={payload.address} {...payload} />}
    </CursorCard>
  );
}

function CardBody({ address, nickname }: Payload) {
  const { data } = useQuery(
    // the server reads the address lowercased, so one profile keeps one cache entry
    orpc.profile.preview.queryOptions({ input: address.toLowerCase(), staleTime: 60_000 }),
  );
  const bannerHidden = useSettings((s) => s.hideBanner);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bannerUrl = data?.bannerImgUrl;

  // the card cannot be hovered, so a video banner plays on its own while it shows
  useEffect(() => {
    if (!bannerUrl || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void videoRef.current?.play().catch(() => undefined);
  }, [bannerUrl]);

  // the link's own name shows until the preview answers
  const name = displayNickname(address, data ? data.nickname : nickname);
  const named = name !== truncateAddress(address);

  return (
    <>
      {/* no strip without a banner: the avatar already carries the initial */}
      {!bannerHidden && data?.bannerImgUrl && (
        <BannerThumb
          bannerImgUrl={data.bannerImgUrl}
          bannerImgType={data.bannerImgType}
          videoRef={videoRef}
        />
      )}

      <div className="flex items-center gap-3 p-3">
        <Avatar className="size-10 shrink-0">
          {data?.user?.image && <AvatarImage src={data.user.image} alt="" />}
          <AvatarFallback className="text-sm font-semibold">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className={cn("truncate", named ? "font-display font-semibold" : "font-mono text-sm")}
          >
            {name}
          </span>

          {data === undefined ? (
            <Skeleton className="h-4 w-32" />
          ) : data.isGuard ? (
            <span className="text-muted-foreground flex items-center gap-1 text-xs">
              <LockSimpleIcon weight="fill" aria-hidden />
              {m.profile_profile_private()}
            </span>
          ) : (
            data.counts && (
              <span className="text-muted-foreground truncate text-xs">
                <span className="text-foreground font-mono font-semibold tabular-nums">
                  {data.counts.objekts.toLocaleString()}
                </span>{" "}
                {m.profile_stats_owned()} ·{" "}
                <span className="text-foreground font-mono font-semibold tabular-nums">
                  {data.counts.collections.toLocaleString()}
                </span>{" "}
                {m.profile_stats_collections()}
              </span>
            )
          )}
        </div>
      </div>
    </>
  );
}
