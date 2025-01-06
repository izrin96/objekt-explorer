import { ValidObjekt } from "@/lib/universal/objekts";

export function getObjektId(objekt: ValidObjekt) {
  if ("objektNo" in objekt) {
    return objekt.objektNo.toString();
  }
  return objekt.id;
}

const map: Record<string, string> = {
  artms: "ARTMS",
  triples: "tripleS",
};

export function getObjektArtist(objekt: ValidObjekt) {
  if ("objektNo" in objekt) {
    return map[objekt.artists[0]!.toLowerCase()];
  }
  return map[objekt.artist.toLowerCase()];
}

export function getObjektType(objekt: ValidObjekt) {
  if ("objektNo" in objekt) {
    return objekt.collectionNo.at(-1) === "Z" ? "online" : "offline";
  }
  return objekt.onOffline;
}

export function getObjektSlug(objekt: ValidObjekt) {
  const slug = objekt.collectionId
    .replace(/[+()]/g, "")
    .replace(/ /g, "-")
    .replace("ö", "o")
    .toLowerCase();
  return slug;
}

export function replaceUrlSize(url: string, size: "2x" | "thumbnail" = "2x") {
  return url.replace(/(4x|3x|original)$/i, size);
}
