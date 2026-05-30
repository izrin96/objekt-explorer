import type { LiveSession } from "@repo/cosmo/server/live";
import { QueryErrorResetBoundary, useQuery } from "@tanstack/react-query";
import { useSearch } from "@tanstack/react-router";
import { ofetch } from "ofetch";
import { ErrorBoundary } from "react-error-boundary";

import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { m } from "@/paraglide/messages";

import { Avatar } from "../intentui/avatar-custom";
import { Link } from "../intentui/link";
import { Loader } from "../intentui/loader";
import { Tab, TabList, TabPanel, Tabs } from "../intentui/tabs";
import ErrorFallbackRender from "../router/error-boundary";

export default function LiveSessionListRender() {
  const { selectedArtists } = useCosmoArtist();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-xl font-semibold">{m.live_title()}</h2>
        </div>
        <span className="text-muted-fg text-sm">{m.live_description()}</span>
      </div>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
            <Tabs className="w-full">
              <TabList className="w-fit">
                {selectedArtists.map((artist) => (
                  <Tab key={artist.id} id={artist.id} aria-label={artist.name}>
                    {artist.title}
                  </Tab>
                ))}
              </TabList>
              {selectedArtists.map((artist) => (
                <TabPanel key={artist.id} id={artist.id}>
                  <LiveSessionList artistId={artist.id} />
                </TabPanel>
              ))}
            </Tabs>
          </ErrorBoundary>
        )}
      </QueryErrorResetBoundary>
    </div>
  );
}

function LiveSessionList({ artistId }: { artistId: string }) {
  const query = useQuery({
    queryKey: ["live-session", artistId],
    queryFn: async () => {
      const result = await ofetch<LiveSession[]>("/api/live-sessions", {
        query: {
          artistId,
        },
      });
      return result;
    },
    staleTime: 1000 * 60 * 5,
    throwOnError: true,
  });
  const lives = query.data ?? [];

  if (query.isPending) {
    return (
      <div className="flex justify-center">
        <Loader variant="ring" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,380px),1fr))] gap-2">
        {lives.map((live) => (
          <LiveSessionCard key={live.id} live={live} />
        ))}
      </div>
      {lives.length === 0 && <div className="flex justify-center">{m.live_no_live()}</div>}
    </>
  );
}

function LiveSessionCard({ live }: { live: LiveSession }) {
  const searchParams = useSearch({ from: "/(container)/live/" });
  return (
    <Link to="/live/$id" params={{ id: `${live.id}` }} search={{ token: searchParams.token }}>
      <div className="flex flex-col gap-2">
        <div className="relative aspect-square overflow-hidden rounded">
          <img
            className="absolute size-full object-cover object-center"
            src={live.thumbnailImage}
            alt={live.title}
          />
          {live.status === "in_progress" && (
            <div className="absolute top-2 left-2 rounded-lg bg-rose-500 px-1.5 py-0.5 text-sm font-semibold text-white shadow">
              {m.live_live_badge()}
            </div>
          )}
        </div>
        <span className="font-semibold">{live.title}</span>
        <div className="flex items-center gap-2">
          <Avatar
            style={
              {
                "--color": live.channel.primaryColorHex,
              } as Record<string, string>
            }
            className="outline-2 outline-(--color)"
            size="sm"
            src={live.channel.profileImageUrl}
          />
          <span className="text-sm font-semibold">{live.channel.name}</span>
        </div>
      </div>
    </Link>
  );
}
