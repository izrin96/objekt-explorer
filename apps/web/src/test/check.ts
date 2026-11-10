import { expect } from "bun:test";

/** `expect` over `unknown`: `m.*` returns a branded string, which `expect(...).toBe("...")` rejects. */
export const check = (actual: unknown) => expect(actual);
