import type { GridObjekt } from "@repo/lib/types/objekt";
import * as z from "zod";

import { isObjektOwned } from "../objekt-utils";

function positiveInt() {
  return z
    .preprocess(
      (value) => (typeof value === "string" ? Number(value) : value),
      z.number().int().positive(),
    )
    .optional()
    .catch(undefined);
}

/**
 * The objekt a link opens in the drawer: `?id=<token id>` for a profile's copy,
 * else `?slug=`; `serial` opens on that serial's history.
 */
export const objektSearchSchema = z.object({
  slug: z.string().min(1).optional().catch(undefined),
  id: positiveInt(),
  serial: positiveInt(),
});

export type ObjektSearch = z.infer<typeof objektSearchSchema>;

/** As a number: the router would quote a numeric string in the URL. */
export function tokenIdOf(objekt: GridObjekt): number | undefined {
  return isObjektOwned(objekt) ? Number(objekt.tokenId) : undefined;
}
