import { create } from "zustand";

import type { LabBanner } from "@/fixtures/banners";
import { users } from "@/fixtures/users";

/** the privacy flags `profile.edit` writes in the app, same names */
export type CosmoSettings = {
  /** hide the site account from the Cosmo profile */
  hideUser: boolean;
  /** hide the Cosmo ID from Activity, Serial Lookup and the profile */
  hideNickname: boolean;
  /** keep this Cosmo out of Serial Lookup */
  privateSerial: boolean;
  /** hide the profile's Activity History */
  hideTransfer: boolean;
  /** only the owner can open the profile */
  privateProfile: boolean;
  /** objekt columns applied on visit; null is "not set" */
  gridColumns: number | null;
  /**
   * `bannerImgUrl` + `bannerImgType` in the app. Tri-state: `undefined` is
   * "never edited here", so the profile header keeps showing its fixture
   * banner, and `null` is "removed", which must not fall back to the fixture.
   */
  banner?: LabBanner | null;
};

export type CosmoLink = CosmoSettings & {
  nickname: string;
  address: string;
  /** when this Cosmo was linked to the account; `LinkedCard` shows the distance */
  linkedAt: Date;
};

export const DEFAULT_COSMO_SETTINGS: CosmoSettings = {
  hideUser: false,
  hideNickname: false,
  privateSerial: false,
  hideTransfer: false,
  privateProfile: false,
  gridColumns: null,
  // `banner` stays absent: a freshly linked Cosmo has not edited its banner
};

/** matches the app's `validColumns` */
export const VALID_COLUMNS = [2, 3, 4, 5, 6, 7, 8] as const;

/**
 * `izrin96` is the Cosmo the rest of the lab belongs to — the banner fixture,
 * the profile every list and list card points at, the only ID `LinkFlow`
 * resolves. Seeding it is what makes "the signed-in user's Cosmo nickname" a
 * real value rather than a case every surface has to fall back out of.
 */
const SEED_NICKNAME = "izrin96";

const seedAddress = users.find((u) => u.nickname === SEED_NICKNAME)?.address ?? "0x0";

const seedLinks: CosmoLink[] = [
  {
    ...DEFAULT_COSMO_SETTINGS,
    nickname: SEED_NICKNAME,
    address: seedAddress,
    // long enough back that the card shows the plain-date half of `relativeTime`
    linkedAt: new Date(Date.now() - 64 * 86_400_000),
  },
];

type LinkState = {
  links: CosmoLink[];
  add: (link: Pick<CosmoLink, "nickname" | "address">) => void;
  edit: (address: string, patch: Partial<CosmoLink>) => void;
  remove: (address: string) => void;
};

export const useCosmoLinks = create<LinkState>((set) => ({
  links: seedLinks,
  // one link per Cosmo address: `LinkFlow` resolves a single fixture ID, so
  // running it twice would otherwise stack two cards on the same address
  add: (link) =>
    set((s) =>
      s.links.some((l) => l.address === link.address)
        ? s
        : {
            links: [
              ...s.links,
              {
                ...DEFAULT_COSMO_SETTINGS,
                nickname: link.nickname,
                address: link.address,
                linkedAt: new Date(),
              },
            ],
          },
    ),
  edit: (address, patch) =>
    set((s) => ({
      links: s.links.map((l) => (l.address === address ? { ...l, ...patch } : l)),
    })),
  remove: (address) => set((s) => ({ links: s.links.filter((l) => l.address !== address) })),
}));
