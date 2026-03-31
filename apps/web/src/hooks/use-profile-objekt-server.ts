import { useDeferredValue } from "react";

import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useOwnedCollectionsServer } from "./use-owned-collections-server";
import { useShapeObjekts } from "./use-shape-objekt";
import { useTarget } from "./use-target";

export function useProfileObjektsServer() {
  const shape = useShapeObjekts();
  const profile = useTarget((a) => a.profile)!;
  const { getSelectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();

  const parsedSelectedArtistIds = getSelectedArtistIds(filters.artist);

  const serverFilters = {
    at: filters.at ?? undefined,
    includeCount: true,
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

  return useDeferredValue({
    shaped: shape(filtered, true),
    filtered,
    total,
    filters,
    query,
  });
}
