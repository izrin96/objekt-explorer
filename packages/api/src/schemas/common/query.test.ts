import { describe, expect, test } from "bun:test";

import * as z from "zod";

import { queryBoolean, queryJson } from "./query";

describe("queryBoolean", () => {
  test("takes a boolean and its query-string text", () => {
    expect(queryBoolean.parse(true)).toBe(true);
    expect(queryBoolean.parse("false")).toBe(false);
    expect(queryBoolean.safeParse("maybe").success).toBe(false);
  });
});

describe("queryJson", () => {
  const schema = queryJson(z.object({ at: z.number() }));

  test("takes the object /rpc sends and the JSON a query string carries", () => {
    expect(schema.parse({ at: 1 })).toEqual({ at: 1 });
    expect(schema.parse('{"at":1}')).toEqual({ at: 1 });
  });

  test("refuses text that is not JSON or not the shape", () => {
    expect(schema.safeParse("{bad").success).toBe(false);
    expect(schema.safeParse('{"at":"1"}').success).toBe(false);
  });
});
