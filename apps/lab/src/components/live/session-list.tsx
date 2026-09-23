import { Link } from "@tanstack/react-router";
import { type CSSProperties, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import type { LabLiveSession } from "@/fixtures/live";
import { liveSessionsFor } from "@/fixtures/live";
import { useArtists } from "@/store/artists";

/**
 * Port of `live/session-list.tsx`: one tab per globally selected artist, each
 * panel a card grid. The app fetches `/api/live-sessions?artistId=`; the lab
 * reads `fixtures/live.ts`, so there is no pending state to render.
 *
 * The tabs are plain (not URL-driven) because the app's are: `session-list.tsx`
 * uses intentui `Tabs` with artist ids, not `TabLink`.
 */
export function LiveSessionList() {
  const selected = useArtists((s) => s.selected);
  const [picked, setPicked] = useState<string | null>(null);
  // the artist store can drop the open tab from under us; fall back to the first
  const current = selected.some((artist) => artist === picked) ? picked : selected[0];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-semibold">Cosmo Live</h2>
        <span className="text-muted-foreground text-sm">Live by member from Cosmo app</span>
      </div>

      <Tabs
        value={current}
        onValueChange={(value) => {
          if (typeof value === "string") setPicked(value);
        }}
        className="w-full gap-4"
      >
        <TabsList className="w-fit">
          {selected.map((artist) => (
            <TabsTab key={artist} value={artist}>
              {artist}
            </TabsTab>
          ))}
        </TabsList>
        {selected.map((artist) => (
          <TabsPanel key={artist} value={artist}>
            <SessionGrid sessions={liveSessionsFor(artist)} />
          </TabsPanel>
        ))}
      </Tabs>
    </div>
  );
}

function SessionGrid({ sessions }: { sessions: LabLiveSession[] }) {
  if (sessions.length === 0) {
    // unreachable with the shipped fixture (every artist carries 3–5 sessions);
    // kept because the app renders it whenever the endpoint answers empty
    return (
      <div className="text-muted-foreground flex justify-center py-12">
        No live available at this moment
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,380px),1fr))] gap-2">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}

function SessionCard({ session }: { session: LabLiveSession }) {
  return (
    <Link
      to="/live/$id"
      params={{ id: session.id }}
      className="focus-visible:ring-ring flex flex-col gap-2 rounded outline-none focus-visible:ring-2"
    >
      <div className="relative aspect-square overflow-hidden rounded">
        <img
          className="absolute size-full object-cover object-center"
          src={session.thumbnailImage}
          alt={session.title}
        />
        {session.status === "in_progress" && (
          <div className="absolute top-2 left-2 rounded-lg bg-rose-500 px-1.5 py-0.5 text-sm font-semibold text-white shadow">
            Live
          </div>
        )}
      </div>
      <span className="font-semibold">{session.title}</span>
      <ChannelIdentity session={session} />
    </Link>
  );
}

function ChannelIdentity({ session }: { session: LabLiveSession }) {
  return (
    <div className="flex items-center gap-2">
      <LiveAvatar session={session} className="size-8 outline-2" />
      <span className="text-sm font-semibold">{session.channel.name}</span>
    </div>
  );
}

/**
 * The channel avatar, outlined in the member's Cosmo colour. The outline width
 * is the caller's (2px on a card, 3px in the footer, 4px on the stage), which
 * is what the app does with its `outline-2` / `outline-3` / `outline-4` classes.
 */
export function LiveAvatar({
  session,
  className,
}: {
  session: LabLiveSession;
  className?: string;
}) {
  return (
    <Avatar
      className={`outline-(--channel) ${className ?? ""}`}
      style={{ "--channel": session.channel.primaryColorHex } as CSSProperties}
    >
      <AvatarImage src={session.channel.profileImageUrl} alt={session.channel.name} />
      <AvatarFallback
        className="text-white"
        style={{ backgroundColor: session.channel.primaryColorHex }}
      >
        {session.channel.name.slice(0, 2)}
      </AvatarFallback>
    </Avatar>
  );
}
