import { queryOptions } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { fetchOwnedObjekts } from "@/components/profile/fetching-util";
import { authClient } from "./auth-client";
import { mapObjektWithTag } from "./objekt-utils";
import type { ValidArtist } from "./universal/cosmo/common";
import type { CollectionMetadata, CollectionResult } from "./universal/objekts";
import { getBaseURL } from "./utils";

export const collectionQueryOptions = (artistIds: ValidArtist[]) =>
  queryOptions({
    queryKey: ["collections", artistIds],
    staleTime: Infinity,
    queryFn: async () => {
      const url = new URL("/api/collection", getBaseURL());
      const result = await ofetch<CollectionResult>(url.toString(), {
        query: {
          artist: artistIds,
        },
      }).then((a) => a.collections);

      return result.map(mapObjektWithTag);
    },
  });

export const ownedCollectionQueryOptions = (address: string, artistIds: ValidArtist[]) =>
  queryOptions({
    queryKey: ["owned-collections", address, artistIds],
    queryFn: () =>
      fetchOwnedObjekts(address, artistIds).then((a) => a.objekts.map(mapObjektWithTag)),
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60,
  });

export const metadataQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["objekts", "metadata", slug],
    queryFn: () => {
      const url = new URL(`/api/objekts/metadata/${slug}`, getBaseURL());
      return ofetch<CollectionMetadata>(url.toString());
    },
  });

export const objektsQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["objekts", "list", slug],
    queryFn: () => {
      const url = new URL(`/api/objekts/list/${slug}`, getBaseURL());
      return ofetch<{ serials: number[] }>(url.toString()).then((res) => res.serials);
    },
  });

export const listAccountQueryOptions = () =>
  queryOptions({
    queryKey: ["accounts"],
    queryFn: async () => {
      const result = await authClient.listAccounts();
      if (result.error) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
