import { describe, expect, test } from "bun:test";

import { offerRulesInputSchema } from "./user";

describe("offerRulesInputSchema", () => {
  test("a tab from before the switch went still parses, and the retired field is dropped", () => {
    // setOfferRules returns without a write on an all-undefined input; a stored key would reach .set()
    expect(offerRulesInputSchema.parse({ multiPostAsks: false })).toEqual({});
  });

  test("keeps the two rules that remain", () => {
    expect(
      offerRulesInputSchema.parse({ onlyWantedOffers: true, allowCollectionAsks: false }),
    ).toEqual({ onlyWantedOffers: true, allowCollectionAsks: false });
  });
});
