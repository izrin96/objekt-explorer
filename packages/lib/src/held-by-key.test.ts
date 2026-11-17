import { expect, test } from "bun:test";

import { heldKey, spinHeldKey } from "./held-by-key";
import { Addresses } from "./index";

test("the key is versioned and carries the address as given", () => {
  expect(heldKey("0xabc")).toBe("held-by:v3:0xabc");
});

test("Spin's key is the key of Spin's address", () => {
  expect(spinHeldKey()).toBe(`held-by:v3:${Addresses.SPIN}`);
});
