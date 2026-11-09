import { describe, expect, test } from "bun:test";

import { ORPCError } from "@orpc/client";

import { m } from "@/paraglide/messages";

import { modErrorText } from "./error-text";

const refused = (reason: string) => new ORPCError("BAD_REQUEST", { data: { reason } });

describe("modErrorText", () => {
  test("names each refusal", () => {
    expect(modErrorText(refused("staff_target"))).toBe(m.mod_staff_target());
    expect(modErrorText(refused("self"))).toBe(m.mod_error_self());
    expect(modErrorText(refused("address_in_trade"))).toBe(m.mod_address_in_trade());
    expect(modErrorText(refused("same_account"))).toBe(m.mod_same_account());
  });

  test("a deleted target reads the caller's text", () => {
    expect(modErrorText(refused("deleted_target"))).toBe(m.mod_deleted_target());
    expect(modErrorText(refused("deleted_target"), m.mod_move_deleted_target)).toBe(
      m.mod_move_deleted_target(),
    );
  });

  test("anything else is the generic failure", () => {
    expect(modErrorText(refused("unknown"))).toBe(m.mod_act_error());
    expect(modErrorText(new Error("network"))).toBe(m.mod_act_error());
  });
});
