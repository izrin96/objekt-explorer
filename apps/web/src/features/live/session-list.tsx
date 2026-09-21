import type { LiveSession } from "@repo/cosmo/types/live";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type CSSProperties, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
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
  const { data, isPending, error } = useQuery(liveSessionsOptions(artistId));

  if (isPending) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-destructive-foreground flex justify-center py-12">{error.message}</div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex justify-center py-12">{m.live_no_live()}</div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,380px),1fr))] gap-2">
      {data.map((live) => (
        <SessionCard key={live.id} live={live} token={token} />
      ))}
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
