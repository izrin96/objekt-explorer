import type { Objekt } from "@repo/db/indexer/schema";

import type { IndexedObjekt, OwnedObjekt, ValidObjekt } from "../types/objekt";

/**
 * Override color for some collection
 */
const collectionOverrides = {
  // Divine collections
  "divine01-seoyeon-117z": { backgroundColor: "#B400FF" },
  "divine01-seoyeon-118z": { backgroundColor: "#B400FF" },
  "divine01-seoyeon-119z": { backgroundColor: "#B400FF" },
  "divine01-seoyeon-120z": { backgroundColor: "#B400FF" },
  "divine01-seoyeon-317z": { backgroundColor: "#df2e37" },

  // Binary collections
  "binary01-choerry-201z": { backgroundColor: "#FFFFFF" },
  "binary01-choerry-202z": { backgroundColor: "#FFFFFF" },

  // Atom collections
  "atom01-yubin-302z": { backgroundColor: "#D300BB" },
  "atom01-nakyoung-302z": { backgroundColor: "#D300BB" },
  "atom01-yooyeon-302z": { backgroundColor: "#D300BB" },
  "atom01-hyerin-302z": { backgroundColor: "#D300BB" },
  "atom01-heejin-322z": { textColor: "#FFFFFF" },
  "atom01-heejin-323z": { textColor: "#FFFFFF" },
  "atom01-heejin-324z": { textColor: "#FFFFFF" },
  "atom01-heejin-325z": { textColor: "#FFFFFF" },

  // Ever collections
  "ever01-seoyeon-338z": { textColor: "#07328D" },
} as const satisfies Record<string, Partial<Pick<ValidObjekt, "backgroundColor" | "textColor">>>;

/**
 * Get custom band image
 */
function getBandImageUrl(objekt: ValidObjekt) {
  if (objekt.bandImageUrl) return objekt.bandImageUrl;

  if (objekt.artist === "idntt") {
    if (objekt.class === "Special") {
      return "https://resources.cosmo.fans/images/collection-band/2025/08/14/06/raw/86207a80d354439cada0ec6c45e076ee20250814061643330.png";
    }

    if (objekt.class === "Unit") {
      return "https://resources.cosmo.fans/images/collection-band/2025/08/14/06/raw/e0e4fdd950bc4ca8ba49a98b053756f620250814065358420.png";
    }

    if (objekt.onOffline === "offline" && objekt.backgroundColor === "#000000") {
      return "https://resources.cosmo.fans/images/collection-band/2025/07/12/04/raw/fab4f9ec98d24a00a7c417e012a493cd20250712042141653.png";
    }

    if (objekt.class === "Welcome" && objekt.collectionNo === "200Z") {
      return "https://resources.cosmo.fans/images/collection-band/2025/04/23/08/raw/7d0e2956b196439eb10dd65ee94ac28e20250423082449685.png";
    }
  }

  return null;
}

/**
 * Apply color and band image overrides to any objekt type
 */
export function overrideCollection<T extends ValidObjekt>(collection: T): T {
  const overrides = collectionOverrides[collection.slug as keyof typeof collectionOverrides];
  const bandImageUrl = getBandImageUrl(collection);

  return {
    ...collection,
    ...overrides,
    bandImageUrl,
  };
}

/**
 * Map database Objekt + Collection to OwnedObjekt type
 */
export function mapOwnedObjekt(objekt: Objekt, collection: IndexedObjekt): OwnedObjekt {
  return {
    ...overrideCollection(collection),
    id: objekt.id,
    serial: objekt.serial,
    receivedAt: objekt.receivedAt,
    mintedAt: objekt.mintedAt,
    transferable: objekt.transferable,
  };
}
