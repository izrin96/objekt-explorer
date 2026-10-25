import { describe, expect, test } from "bun:test";

import { PARTNER_TOKEN, splitAround } from "./headline";

describe("splitAround", () => {
  test("the token at the start", () => {
    expect(splitAround(`${PARTNER_TOKEN} sent you an offer`, PARTNER_TOKEN)).toEqual({
      before: "",
      after: " sent you an offer",
    });
  });

  test("the token in the middle, as Korean and Japanese place it", () => {
    expect(splitAround(`거래: ${PARTNER_TOKEN}님이 기다리고 있습니다`, PARTNER_TOKEN)).toEqual({
      before: "거래: ",
      after: "님이 기다리고 있습니다",
    });
  });

  test("no token", () => {
    expect(splitAround("Offer expired", PARTNER_TOKEN)).toBeNull();
  });

  test("only the first of two is split", () => {
    expect(splitAround(`${PARTNER_TOKEN} and ${PARTNER_TOKEN}`, PARTNER_TOKEN)).toEqual({
      before: "",
      after: ` and ${PARTNER_TOKEN}`,
    });
  });
});
