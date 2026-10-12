import { expect, test } from "bun:test";

import { ORPCError } from "@orpc/server";

import { refuse } from "./refuse";

test("throws the status, English message and reason", () => {
  let thrown: unknown;
  try {
    refuse("BAD_REQUEST", "list_have_links_want", "Have lists can only link to Want lists");
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(ORPCError);
  const error = thrown as ORPCError<string, { reason: string }>;
  expect(error.code).toBe("BAD_REQUEST");
  expect(error.status).toBe(400);
  expect(error.message).toBe("Have lists can only link to Want lists");
  expect(error.data).toEqual({ reason: "list_have_links_want" });
});

test("merges extra data beside the reason", () => {
  let thrown: unknown;
  try {
    refuse("BAD_REQUEST", "user_failed_get_info", "Failed", { provider: "Discord" });
  } catch (error) {
    thrown = error;
  }
  expect((thrown as ORPCError<string, unknown>).data).toEqual({
    reason: "user_failed_get_info",
    provider: "Discord",
  });
});
