import type { ValidObjekt } from "@repo/lib/types/objekt";

import { m } from "@/paraglide/messages";

/**
 * A collection reaches the market grid only once something is listed, so the
 * absence of a floor means every live listing is QYOP or carries no price.
 */
export function getPriceLabel(objekt: ValidObjekt, formatUsd: (usd: number) => string): string {
  if (objekt.floorPrice !== null && objekt.floorPrice !== undefined) {
    return m.market_floor_price({ price: formatUsd(objekt.floorPrice) });
  }
  return objekt.hasQyop === true ? m.objekt_qyop() : m.market_price_ask();
}

export function hasFloorPrice(objekt: ValidObjekt): boolean {
  return objekt.floorPrice !== null && objekt.floorPrice !== undefined;
}
