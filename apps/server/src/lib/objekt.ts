import type { Objekt } from "@objekt-explorer/db/indexer/schema";
import { getScoEdition } from "./collection-grid";
import type { IndexedObjekt, OwnedObjekt, ValidObjekt } from "./universal/objekts";

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

function getEdition(collectionNo: string) {
  const collection = parseInt(collectionNo);

  if (collection >= 101 && collection <= 108) {
    return 1;
  }
  if (collection >= 109 && collection <= 116) {
    return 2;
  }
  if (collection >= 117 && collection <= 120) {
    return 3;
  }
  return null;
}

function getBandImageUrl(objekt: ValidObjekt) {
  if (objekt.bandImageUrl) return objekt.bandImageUrl;

  if (objekt.artist === "idntt") {
    if (objekt.class === "Special") {
      objekt.bandImageUrl =
        "https://resources.cosmo.fans/images/collection-band/2025/08/14/06/raw/86207a80d354439cada0ec6c45e076ee20250814061643330.png";
    }

    if (objekt.class === "Unit") {
      objekt.bandImageUrl =
        "https://resources.cosmo.fans/images/collection-band/2025/08/14/06/raw/e0e4fdd950bc4ca8ba49a98b053756f620250814065358420.png";
    }

    if (objekt.onOffline === "offline" && objekt.backgroundColor === "#000000") {
      objekt.bandImageUrl =
        "https://resources.cosmo.fans/images/collection-band/2025/07/12/04/raw/fab4f9ec98d24a00a7c417e012a493cd20250712042141653.png";
    }
  }

  return null;
}

export function overrideCollection<T extends ValidObjekt>(collection: T): T {
  // temporary fix accent color for some collection
  const accentColor = overrideAccents[collection.slug];
  const fontColor = overrideFonts[collection.slug];
  const bandImageUrl = getBandImageUrl(collection);
  const edition =
    collection.class === "Special"
      ? getScoEdition(collection.slug)
      : collection.class === "First"
        ? getEdition(collection.collectionNo)
        : null;

  return {
    ...collection,
    backgroundColor: accentColor ?? collection.backgroundColor,
    textColor: fontColor ?? collection.textColor,
    bandImageUrl: bandImageUrl,
    edition: edition,
  };
}

export function mapOwnedObjekt(objekt: Objekt, collection: IndexedObjekt): OwnedObjekt {
  return {
    ...overrideCollection(collection),
    id: objekt.id.toString(),
    serial: objekt.serial,
    receivedAt: objekt.receivedAt,
    mintedAt: objekt.mintedAt,
    transferable: objekt.transferable,
  };
}
