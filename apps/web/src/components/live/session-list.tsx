"use client";

import type { LiveSession } from "@repo/cosmo/server/live";

import { QueryErrorResetBoundary, useSuspenseQuery } from "@tanstack/react-query";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { ofetch } from "ofetch";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { useCosmoArtist } from "@/hooks/use-cosmo-artist";
import { getBaseURL } from "@/lib/utils";

import ErrorFallbackRender from "../error-boundary";
import { Avatar } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { Link } from "../ui/link";
import { Loader } from "../ui/loader";
import { Tab, TabList, TabPanel, Tabs } from "../ui/tabs";

export default function LiveSessionListRender() {
  const { selectedArtists } = useCosmoArtist();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Cosmo Live</h2>
          <Badge intent="warning">Alpha</Badge>
        </div>
        <p className="text-muted-fg text-sm">Live by member from Cosmo app</p>
      </div>
      <QueryErrorResetBoundary>
        {({ reset }) => (
          <ErrorBoundary onReset={reset} FallbackComponent={ErrorFallbackRender}>
            <Tabs aria-label="Recipe App">
              <TabList className="w-fit">
                {selectedArtists.map((artist) => (
                  <Tab key={artist.id} id={artist.id} aria-label={artist.name}>
                    {artist.title}
                  </Tab>
                ))}
              </TabList>
              {selectedArtists.map((artist) => (
                <TabPanel key={artist.id} id={artist.id}>
                  <Suspense
                    fallback={
                      <div className="flex justify-center">
                        <Loader variant="ring" />
                      </div>
                    }
                  >
                    <LiveSessionList artistId={artist.id} />
                  </Suspense>
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
  const query = useSuspenseQuery({
    queryKey: ["live-session", artistId],
    queryFn: async () => {
      const url = new URL("/api/live-sessions", getBaseURL());
      const result = await ofetch<LiveSession[]>(url.toString(), {
        query: {
          artistId,
        },
      });
      return result;
    },
    staleTime: 5 * 1000,
  });

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {query.data.map((live) => (
          <LiveSessionCard key={live.id} live={live} />
        ))}
      </div>
      {query.data.length === 0 && (
        <div className="flex justify-center">No live available at this moment</div>
      )}
    </>
  );
}

function LiveSessionCard({ live }: { live: LiveSession }) {
  const searchParams = useSearchParams();
  return (
    <Link
      href={`/live/${live.id}${searchParams.get("token") ? `?token=${searchParams.get("token")}` : ""}`}
    >
      <div className="flex flex-col gap-2">
        <div className="relative aspect-square overflow-hidden rounded">
          <Image
            className="size-full object-cover object-center"
            fill
            src={live.thumbnailImage}
            alt={live.title}
          />
          {live.status === "in_progress" && (
            <div className="absolute top-2 left-2 rounded-lg bg-rose-500 px-1.5 py-0.5 text-sm font-semibold text-white shadow">
              Live
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
