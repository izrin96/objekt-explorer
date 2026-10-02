import type { MarketObjekt } from "@repo/lib/types/objekt";

import { m } from "@/paraglide/messages";

/**
 * A collection reaches the market grid only once something is listed, so the
 * absence of a floor means every live listing is QYOP or carries no price.
 */
export function getPriceLabel(objekt: MarketObjekt, formatUsd: (usd: number) => string): string {
  if (objekt.floorPrice !== null) {
    return m.market_floor_price({ price: formatUsd(objekt.floorPrice) });
  }
  return objekt.hasQyop ? m.objekt_qyop() : m.market_price_ask();
}

export function hasFloorPrice(objekt: MarketObjekt): boolean {
  return objekt.floorPrice !== null;
}
