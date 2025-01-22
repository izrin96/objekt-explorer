import { ValidObjekt } from "@/lib/universal/objekts";

const map: Record<string, string> = {
  artms: "ARTMS",
  triples: "tripleS",
};

export function getObjektArtist(objekt: ValidObjekt) {
  return map[objekt.artist.toLowerCase()];
}

export function replaceUrlSize(url: string, size: "2x" | "thumbnail" = "2x") {
  return url.replace(/(4x|3x|original)$/i, size);
}
