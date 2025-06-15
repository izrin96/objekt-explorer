"use client";

import React, { CSSProperties, Suspense } from "react";
import { Avatar, Badge, Link, Loader, Tabs } from "../ui";
import {
  QueryErrorResetBoundary,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { LiveSession } from "@/lib/universal/cosmo/live";
import Image from "next/image";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallbackRender from "../error-boundary";
import { getBaseURL } from "@/lib/utils";
import { useCosmoArtist } from "@/hooks/use-cosmo-artist";

export default function LiveSessionListRender() {
  const { artists } = useCosmoArtist();
  return (
    <>
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
            <ErrorBoundary
              onReset={reset}
              FallbackComponent={ErrorFallbackRender}
            >
              <Tabs aria-label="Recipe App">
                <Tabs.List className="w-fit">
                  {artists.map((artist) => (
                    <Tabs.Tab key={artist.id} id={artist.id}>
                      {artist.title}
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
                {artists.map((artist) => (
                  <Tabs.Panel key={artist.id} id={artist.id}>
                    <Suspense
                      fallback={
                        <div className="flex justify-center">
                          <Loader variant="ring" />
                        </div>
                      }
                    >
                      <LiveSessionList artistId={artist.id} />
                    </Suspense>
                  </Tabs.Panel>
                ))}
              </Tabs>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </>
  );
}

export function LiveSessionList({ artistId }: { artistId: string }) {
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
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {query.data.map((live) => (
          <LiveSessionCard key={live.id} live={live} />
        ))}
      </div>
      {query.data.length === 0 && (
        <div className="flex justify-center">
          No live available at this moment
        </div>
      )}
    </>
  );
}

function LiveSessionCard({ live }: { live: LiveSession }) {
  return (
    <Link href={`/live/${live.id}`}>
      <div className="flex flex-col gap-2">
        <div className="relative aspect-square rounded overflow-hidden">
          <Image
            priority
            className="object-cover object-center size-full"
            fill
            src={live.thumbnailImage}
            alt={live.title}
          />
          {live.status === "in_progress" && (
            <div className="px-1.5 py-0.5 text-sm bg-rose-500 text-white absolute top-2 left-2 font-semibold rounded shadow">
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
              } as CSSProperties
            }
            className="outline-2 outline-(--color)"
            size="small"
            src={live.channel.profileImageUrl}
          />
          <span className="text-sm font-semibold">{live.channel.name}</span>
        </div>
      </div>
    </Link>
  );
}
