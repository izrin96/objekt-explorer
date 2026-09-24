import { ArrowClockwiseIcon, VideoCameraSlashIcon, WarningIcon } from "@phosphor-icons/react";
import type { LiveSession } from "@repo/cosmo/types/live";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type CSSProperties, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Shimmer } from "@/components/shared/shimmer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { useCosmoArtist } from "@/features/artist/cosmo-artist-provider";
import { liveSessionsOptions } from "@/features/live/queries";
import { m } from "@/paraglide/messages";

export function LiveSessionList({ token }: { token: string | undefined }) {
  const { selectedArtists } = useCosmoArtist();
  const [picked, setPicked] = useState<string | null>(null);
  // the artist scope can drop the open tab from under us; fall back to the first
  const current = selectedArtists.some((a) => a.id === picked) ? picked : selectedArtists[0]?.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-semibold">{m.live_title()}</h2>
        <span className="text-muted-foreground text-sm">{m.live_description()}</span>
      </div>

      <Tabs
        value={current}
        onValueChange={(value) => {
          if (typeof value === "string") setPicked(value);
        }}
        className="w-full gap-4"
      >
        <TabsList className="w-fit">
          {selectedArtists.map((artist) => (
            <TabsTab key={artist.id} value={artist.id}>
              {artist.title}
            </TabsTab>
          ))}
        </TabsList>
        {selectedArtists.map((artist) => (
          <TabsPanel key={artist.id} value={artist.id}>
            <SessionGrid artistId={artist.id} token={token} />
          </TabsPanel>
        ))}
      </Tabs>
    </div>
  );
}

function SessionGrid({ artistId, token }: { artistId: string; token: string | undefined }) {
  const { data, isPending, isError, refetch } = useQuery(liveSessionsOptions(artistId));

  if (isPending) {
    return (
      <div className={GRID}>
        <SessionCardShimmer />
        <SessionCardShimmer />
        <SessionCardShimmer />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={WarningIcon}
        title={m.common_error_loading_data()}
        action={
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <ArrowClockwiseIcon />
            {m.common_error_retry()}
          </Button>
        }
      />
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={VideoCameraSlashIcon}
        title={m.live_no_live()}
        hint={m.live_no_live_hint()}
      />
    );
  }

  return (
    <div className={GRID}>
      {data.map((live) => (
        <SessionCard key={live.id} live={live} token={token} />
      ))}
    </div>
  );
}

const GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(100%,380px),1fr))] gap-2";

function SessionCardShimmer() {
  return (
    <div className="flex flex-col gap-2">
      <Shimmer className="aspect-square w-full rounded" />
      <Shimmer className="h-6 w-2/3" />
      <div className="flex items-center gap-2">
        <Shimmer className="size-8 rounded-full" />
        <Shimmer className="h-5 w-24" />
      </div>
    </div>
  );
}

function SessionCard({ live, token }: { live: LiveSession; token: string | undefined }) {
  return (
    <Link
      to="/live/$id"
      params={{ id: `${live.id}` }}
      search={{ token }}
      className="focus-visible:ring-ring flex flex-col gap-2 rounded outline-none focus-visible:ring-2"
    >
      <div className="relative aspect-square overflow-hidden rounded">
        <img
          className="absolute size-full object-cover object-center"
          src={live.thumbnailImage}
          alt=""
        />
        {live.status === "in_progress" && (
          <div className="absolute top-2 left-2 rounded-lg bg-rose-500 px-1.5 py-0.5 text-sm font-semibold text-white shadow">
            {m.live_live_badge()}
          </div>
        )}
      </div>
      <span className="font-semibold">{live.title}</span>
      <div className="flex items-center gap-2">
        <LiveAvatar live={live} className="size-8 outline-2" />
        <span className="text-sm font-semibold">{live.channel.name}</span>
      </div>
    </Link>
  );
}

/** the outline width is the caller's: 2px on a card, 3px in the footer, 4px on the stage */
export function LiveAvatar({ live, className }: { live: LiveSession; className?: string }) {
  return (
    <Avatar
      className={`outline-(--channel) ${className ?? ""}`}
      style={{ "--channel": live.channel.primaryColorHex } as CSSProperties}
    >
      <AvatarImage src={live.channel.profileImageUrl} alt={live.channel.name} />
      <AvatarFallback
        className="text-white"
        style={{ backgroundColor: live.channel.primaryColorHex }}
      >
        {live.channel.name.slice(0, 2)}
      </AvatarFallback>
    </Avatar>
  );
}
