import type { OwnedBySchema } from "@/lib/universal/owned-by";

import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useOwnedCollectionsServer } from "./use-owned-collections-server";
import { useProfileTarget } from "./use-profile-target";

export function useProfileObjektsServer() {
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
    filtered,
    total,
    filters,
    query,
  };
}
