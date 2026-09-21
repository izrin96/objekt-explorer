import { useMemo } from "react";

import type { SocialPlatform } from "@/components/shared/social-badge";
import type { BannerKind } from "@/fixtures/banners";
import { type LabObjekt, objekts, ownedObjekt } from "@/fixtures/objekts";
import { hash31 as hash } from "@/lib/seeded";
import { scopeArtists, useArtists } from "@/store/artists";

/**
 * Which of the fake profiles carry a banner. Everyone else has none at all,
 * which is the "no banner block, identity starts under the nav" case.
 */
const BANNERS: Record<string, BannerKind> = {
  izrin96: "image",
  ryusion: "video",
};

export type Profile = {
  nickname: string;
  address: string;
  verified: boolean;
  /** null when the profile has no `bannerImgUrl` / `bannerImgType` */
  bannerKind: BannerKind | null;
  /** drives the generated banner gradient */
  bannerSeed: number;
  socials: { label: string; platform: SocialPlatform }[];
  objekts: LabObjekt[];
  pinnedIds: string[];
  lockedIds: string[];
};

const DAY = 86_400_000;

/**
 * Display names for the site accounts behind the fake Cosmos. The first chip
 * in a profile's socials row names the *account*, not the Cosmo — repeating
 * the nickname there said nothing the heading right above it had not already
 * said. The signed-in user's own Cosmos take the live `store/account.ts` name
 * instead; `ProfileHeader` swaps it in, so these only cover other people.
 */
const ACCOUNT_NAMES = ["Rin", "Mira", "Kai", "Dani", "Noor", "Sol", "Ari", "Jae", "Wren", "Tam"];

/**
 * Cosmos that hold nothing. Every other fake profile is a deterministic slice
 * of the catalogue, so without one of these the lab had no way to reach the
 * "fresh account" state that the Collection and Progress tabs both have to
 * answer for. `joobin97` is a real row in `fixtures/users.ts`, so ⌘K finds it.
 */
const EMPTY_PROFILES = new Set(["joobin97"]);

function accountName(nickname: string): string {
  return ACCOUNT_NAMES[hash(nickname) % ACCOUNT_NAMES.length] ?? "Rin";
}

/**
 * Deterministic per-nickname slice of the collections, each turned into an
 * owned token: real collection, locally generated serial / transferable /
 * receivedAt. The drawer reads `serial` to decide it is in owned mode.
 */
export function getProfile(nickname: string): Profile {
  const h = hash(nickname);
  const offset = h % 5;
  const owned = EMPTY_PROFILES.has(nickname)
    ? []
    : objekts
        .filter((_, i) => (i + offset) % 5 !== 4)
        .map((collection, i) => {
          const spread = hash(`${nickname}${collection.slug}`);
          return ownedObjekt(
            collection,
            // keep inside the real supply of a small collection so the live
            // transfers endpoint usually has a history for it
            1 + (spread % 150),
            spread % 7 !== 0,
            new Date(Date.now() - ((spread % 400) + i) * DAY),
          );
        });
  const pinnedIds = owned.slice(0, 4).map((o) => o.id);
  const lockedIds = owned.filter((_, i) => i % 4 === 0).map((o) => o.id);
  return {
    nickname,
    address: `0x0a697C3E3Eb83E17c96F74FB36c7c77829e${h.toString(16).padStart(5, "0").slice(0, 5)}`,
    verified: nickname === "izrin96" || h % 3 !== 0,
    bannerKind: BANNERS[nickname] ?? null,
    bannerSeed: h % 360,
    socials: [
      { label: accountName(nickname), platform: "cosmo" },
      { label: `.${nickname.toLowerCase()}`, platform: "discord" },
      { label: `${nickname.toLowerCase()}_`, platform: "twitter" },
    ],
    objekts: owned,
    pinnedIds,
    lockedIds,
  };
}

/**
 * The profile as the globally selected artists see it. One chokepoint, so the
 * header stats, the tab count, the collection grid and the progress bars can
 * never disagree about how many objekts the profile holds.
 */
export function useScopedProfile(nickname: string): Profile {
  const scope = useArtists((s) => s.selected);

  return useMemo(() => {
    const profile = getProfile(nickname);
    const owned = scopeArtists(profile.objekts, scope);
    const ids = new Set(owned.map((o) => o.id));
    return {
      ...profile,
      objekts: owned,
      pinnedIds: profile.pinnedIds.filter((id) => ids.has(id)),
      lockedIds: profile.lockedIds.filter((id) => ids.has(id)),
    };
  }, [nickname, scope]);
}

export function uniqueCollections(owned: LabObjekt[]): number {
  return new Set(owned.map((o) => o.collectionId)).size;
}
