import type { OwnedBySchema } from "@/lib/universal/owned-by";

import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useOwnedCollectionsServer } from "./use-owned-collections-server";
import { useProfileTarget } from "./use-profile-target";
import { useShapeObjekts } from "./use-shape-objekt";

export function useProfileObjektsServer() {
  const shape = useShapeObjekts();
  const profile = useProfileTarget()!;
  const { getSelectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();

  const parsedSelectedArtistIds = getSelectedArtistIds(filters.artist);

  const serverFilters: OwnedBySchema = {
    at: filters.at ?? undefined,
    limit: 300,
    artist: parsedSelectedArtistIds ?? undefined,
    member: filters.member ?? undefined,
    class: filters.class ?? undefined,
    season: filters.season ?? undefined,
    onOffline: filters.on_offline ?? undefined,
    transferable: filters.transferable ?? undefined,
    collection: filters.collection ?? undefined,
    sort: filters.sort ?? undefined,
    sort_dir: filters.sort_dir ?? undefined,
  };

  const {
    objekts: filtered,
    total,
    query,
  } = useOwnedCollectionsServer(profile.address, serverFilters);

  return {
    shaped: shape(filtered, filters, true),
    filtered,
    total,
    filters,
    query,
  };
}
