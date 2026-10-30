import { describe, expect, test } from "bun:test";

import { EMPTY_CHOICES, joinSections, toFormatOptions, withGroupBy } from "./choices";

describe("joinSections", () => {
  test("a section is its heading, a blank line, then its body", () => {
    expect(joinSections([{ heading: "## Have", body: "a\nb" }], false)).toBe("## Have\n\na\nb");
  });

  test("an empty body still prints the heading", () => {
    expect(joinSections([{ heading: "## Have", body: "" }], false)).toBe("## Have\n\n");
  });

  test("rules come before the body, bulleted when the list is", () => {
    expect(joinSections([{ heading: "## Want", rules: ["any CC366"], body: "x" }], true)).toBe(
      "## Want\n\n- any CC366\nx",
    );
    expect(joinSections([{ heading: "## Want", rules: ["any CC366"] }], false)).toBe(
      "## Want\n\nany CC366",
    );
  });

  test("a link closes its section after a blank line", () => {
    expect(joinSections([{ heading: "## Have", body: "x", url: "https://a/b" }], false)).toBe(
      "## Have\n\nx\n\n[View list](<https://a/b>)",
    );
  });

  test("sections are separated by a blank line", () => {
    expect(
      joinSections(
        [
          { heading: "## Have", body: "x" },
          { heading: "## Want", body: "y" },
        ],
        false,
      ),
    ).toBe("## Have\n\nx\n\n## Want\n\ny");
  });

  test("no sections is no text", () => {
    expect(joinSections([], false)).toBe("");
  });
});

describe("withGroupBy", () => {
  test("keeps the style while there is a grouping", () => {
    const choices = { ...EMPTY_CHOICES, groupBy: "season" as const, style: "compact" as const };
    expect(withGroupBy(choices, "season-first")).toMatchObject({
      groupBy: "season-first",
      style: "compact",
    });
  });

  test("no grouping resets the style, since compact only differs with one", () => {
    const choices = { ...EMPTY_CHOICES, groupBy: "season" as const, style: "compact" as const };
    expect(withGroupBy(choices, "none")).toMatchObject({ groupBy: "none", style: "default" });
    expect(withGroupBy(choices, null)).toMatchObject({ groupBy: "none", style: "default" });
  });
});

test("toFormatOptions maps the choices onto format()'s options", () => {
  const compare = () => 0;
  const options = toFormatOptions(
    { ...EMPTY_CHOICES, showCount: true, groupBy: "season" },
    compare,
    compare,
  );
  expect(options).toMatchObject({ showQuantity: true, groupByMode: "season", style: "default" });
  expect(options.compareSeason).toBe(compare);
});
