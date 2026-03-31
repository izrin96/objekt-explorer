import { useDeferredValue } from "react";

import { useCosmoArtist } from "./use-cosmo-artist";
import { useFilters } from "./use-filters";
import { useOwnedCollectionsServer } from "./use-owned-collections-server";
import { useShapeObjekts } from "./use-shape-objekt";
import { useTarget } from "./use-target";

export function useProfileObjektsServer() {
  const shape = useShapeObjekts();
  const profile = useTarget((a) => a.profile)!;
  const { selectedArtistIds } = useCosmoArtist();
  const [filters] = useFilters();

  const serverFilters = {
    artist: selectedArtistIds,
    ...(filters.at !== null && { at: filters.at }),
    ...(filters.member && { member: filters.member }),
    ...(filters.class && { class: filters.class }),
    ...(filters.season && { season: filters.season }),
    ...(filters.on_offline && { onOffline: filters.on_offline }),
    ...(filters.transferable !== null && { transferable: filters.transferable }),
    ...(filters.collection && { collection: filters.collection }),
    ...(filters.sort && { sort: filters.sort }),
    ...(filters.sort_dir && { sort_dir: filters.sort_dir }),
  };

  const { objekts: filtered, query } = useOwnedCollectionsServer(profile.address, serverFilters);

  return useDeferredValue({
    shaped: shape(filtered, true),
    filtered,
    filters,
    query,
  });
}
