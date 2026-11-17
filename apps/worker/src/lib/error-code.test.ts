import { describe, expect, test } from "bun:test";

import { errorCode } from "./error-code";

describe("errorCode", () => {
  test("a pg error gives its code, never its message or parameters", () => {
    const pg = Object.assign(new Error("insert ... params: cookie=secret"), { code: "23505" });
    expect(errorCode(pg)).toBe("pg 23505");
  });

  test("a drizzle wrapper gives the driver error's code from its cause", () => {
    const pg = Object.assign(new Error("driver"), { code: "55P03" });
    expect(errorCode(new Error("Failed query: select ... params: 1,2", { cause: pg }))).toBe(
      "pg 55P03",
    );
  });

  test("an error without a code gives its name", () => {
    expect(errorCode(new TypeError("secret in here"))).toBe("TypeError");
  });

  test("anything else is unknown", () => {
    expect(errorCode("boom")).toBe("unknown");
    expect(errorCode(null)).toBe("unknown");
  });

  test("a name or code that is not a short identifier is unknown", () => {
    const odd = Object.assign(new Error("x"), { code: "has spaces and secrets" });
    expect(errorCode(odd)).toBe("Error");
    const named = new Error("x");
    named.name = "a b c";
    expect(errorCode(named)).toBe("unknown");
  });
});
