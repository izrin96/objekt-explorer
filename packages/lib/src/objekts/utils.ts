import type { Collection, Objekt } from "@repo/db/indexer/schema";

import type { PublicCollection, PublicObjekt } from "./types";

const overrideAccents: Record<string, string> = {
  "divine01-seoyeon-117z": "#B400FF",
  "divine01-seoyeon-118z": "#B400FF",
  "divine01-seoyeon-119z": "#B400FF",
  "divine01-seoyeon-120z": "#B400FF",
  "divine01-seoyeon-317z": "#df2e37",
  "binary01-choerry-201z": "#FFFFFF",
  "binary01-choerry-202z": "#FFFFFF",
  "atom01-yubin-302z": "#D300BB",
  "atom01-nakyoung-302z": "#D300BB",
  "atom01-yooyeon-302z": "#D300BB",
  "atom01-hyerin-302z": "#D300BB",
};

const overrideFonts: Record<string, string> = {
  "atom01-heejin-322z": "#FFFFFF",
  "atom01-heejin-323z": "#FFFFFF",
  "atom01-heejin-324z": "#FFFFFF",
  "atom01-heejin-325z": "#FFFFFF",
  "ever01-seoyeon-338z": "#07328D",
};

function getBandImageUrl(collection: Collection) {
  if (collection.bandImageUrl) return collection.bandImageUrl;

  if (collection.artist === "idntt") {
    if (collection.class === "Special") {
      return "https://resources.cosmo.fans/images/collection-band/2025/08/14/06/raw/86207a80d354439cada0ec6c45e076ee20250814061643330.png";
    }

    if (collection.class === "Unit") {
      return "https://resources.cosmo.fans/images/collection-band/2025/08/14/06/raw/e0e4fdd950bc4ca8ba49a98b053756f620250814065358420.png";
    }

    if (collection.onOffline === "offline" && collection.backgroundColor === "#000000") {
      return "https://resources.cosmo.fans/images/collection-band/2025/07/12/04/raw/fab4f9ec98d24a00a7c417e012a493cd20250712042141653.png";
    }

    if (collection.class === "Welcome" && collection.collectionNo === "200Z") {
      return "https://resources.cosmo.fans/images/collection-band/2025/04/23/08/raw/7d0e2956b196439eb10dd65ee94ac28e20250423082449685.png";
    }
  }

  return null;
}

export function overrideCollection(collection: Collection) {
  // temporary fix accent color for some collection
  const accentColor = overrideAccents[collection.slug];
  const fontColor = overrideFonts[collection.slug];
  const bandImageUrl = getBandImageUrl(collection);

  return {
    ...collection,
    backgroundColor: accentColor ?? collection.backgroundColor,
    textColor: fontColor ?? collection.textColor,
    bandImageUrl: bandImageUrl,
  };
}

export function mapPublicCollection(collection: Collection): PublicCollection {
  return {
    ...collection,
    createdAt: collection.createdAt.toISOString(),
  };
}

export function mapPublicObjekt(objekt: Objekt, collection: Collection): PublicObjekt {
  return {
    ...mapPublicCollection(collection),
    id: objekt.id,
    serial: objekt.serial,
    receivedAt: objekt.receivedAt.toISOString(),
    mintedAt: objekt.mintedAt.toISOString(),
    transferable: objekt.transferable,
  };
}
