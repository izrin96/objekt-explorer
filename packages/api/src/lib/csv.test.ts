import { describe, expect, test } from "bun:test";

import { escapeCSV } from "./csv";

describe("escapeCSV", () => {
  test("leaves plain text alone", () => {
    expect(escapeCSV("SeoYeon 204Z")).toBe("SeoYeon 204Z");
  });

  test("quotes a cell holding a comma, quote or line break", () => {
    expect(escapeCSV("a,b")).toBe('"a,b"');
    expect(escapeCSV('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCSV("a\nb")).toBe('"a\nb"');
  });

  test("turns a formula into text", () => {
    expect(escapeCSV("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(escapeCSV("+1")).toBe("'+1");
    expect(escapeCSV("-1")).toBe("'-1");
    expect(escapeCSV("@cmd")).toBe("'@cmd");
    expect(escapeCSV("\tx")).toBe("'\tx");
    expect(escapeCSV("\rx")).toBe('"\'\rx"');
    expect(escapeCSV('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
  });
});
