import { describe, expect, test } from "bun:test";

import {
  differsFromCosmo,
  groupKey,
  isStaffColour,
  planColourWrite,
  planCosmoResolve,
  planReplay,
  suggestSiblings,
} from "./collection-colours";

const clean = {
  textColor: "#000000",
  backgroundColor: "#FF7477",
  sourceTextColor: null,
  sourceBackgroundColor: null,
  textColorPinned: null,
  backgroundColorPinned: null,
};

const none = { textColor: null, backgroundColor: null, textPinned: false, backgroundPinned: false };

describe("planColourWrite", () => {
  test("a colour on a clean row keeps its source beside it", () => {
    const plan = planColourWrite(clean, { textColor: "#ffffff" });
    expect(plan.set).toEqual({ textColor: "#ffffff", sourceTextColor: "#000000" });
    expect(plan.before).toEqual(none);
    expect(plan.after).toEqual({ ...none, textColor: "#ffffff" });
  });

  test("a second save keeps the first source", () => {
    const row = { ...clean, backgroundColor: "#b400ff", sourceBackgroundColor: "#FF7477" };
    const plan = planColourWrite(row, { backgroundColor: "#df2e37" });
    expect(plan.set).toEqual({ backgroundColor: "#df2e37" });
    expect(plan.before).toEqual({ ...none, backgroundColor: "#b400ff" });
    expect(plan.after).toEqual({ ...none, backgroundColor: "#df2e37" });
  });

  test("a reset puts the source back and clears it", () => {
    const row = { ...clean, backgroundColor: "#df2e37", sourceBackgroundColor: "#FF7477" };
    const plan = planColourWrite(row, { backgroundColor: null });
    expect(plan.set).toEqual({ backgroundColor: "#FF7477", sourceBackgroundColor: null });
    expect(plan.before).toEqual({ ...none, backgroundColor: "#df2e37" });
    expect(plan.after).toEqual(none);
  });

  test("resetting one of two leaves the other override", () => {
    const row = {
      ...clean,
      textColor: "#ffffff",
      backgroundColor: "#d300bb",
      sourceTextColor: "#000000",
      sourceBackgroundColor: "#8A2BE2",
    };
    const plan = planColourWrite(row, { backgroundColor: null });
    expect(plan.set).toEqual({ backgroundColor: "#8A2BE2", sourceBackgroundColor: null });
    expect(plan.after).toEqual({ ...none, textColor: "#ffffff" });
  });

  test("a reset with no override changes no column", () => {
    const plan = planColourWrite(clean, { textColor: null });
    expect(plan.set).toEqual({});
    expect(plan.before).toEqual(none);
    expect(plan.after).toEqual(none);
  });

  test("a malformed source is kept as given, so a reset restores it", () => {
    const row = { ...clean, textColor: "#7328D" };
    const set = planColourWrite(row, { textColor: "#07328d" });
    expect(set.set).toEqual({ textColor: "#07328d", sourceTextColor: "#7328D" });

    const saved = { ...row, ...set.set };
    const reset = planColourWrite(saved, { textColor: null });
    expect(reset.set).toEqual({ textColor: "#7328D", sourceTextColor: null });
  });

  test("a text reset goes to Cosmo's recorded colour when there is one", () => {
    const row = { ...clean, textColor: "#000000", sourceTextColor: "#ffffff" };
    const plan = planColourWrite(row, { textColor: null }, "#2D1F17");
    expect(plan.set).toEqual({ textColor: "#2d1f17", sourceTextColor: null });
    expect(plan.shown.textColor).toBe("#2d1f17");
  });

  test("a text reset with Cosmo unknown puts the source back", () => {
    const row = { ...clean, textColor: "#ffffff", sourceTextColor: "#000000" };
    const plan = planColourWrite(row, { textColor: null }, null);
    expect(plan.set).toEqual({ textColor: "#000000", sourceTextColor: null });
  });

  test("a background reset puts the kept source back exactly", () => {
    const row = { ...clean, backgroundColor: "#df2e37", sourceBackgroundColor: "#FF7477" };
    const plan = planColourWrite(row, { backgroundColor: null }, "#2d1f17");
    expect(plan.set).toEqual({ backgroundColor: "#FF7477", sourceBackgroundColor: null });
  });

  test("a pin is set with the colour and recorded in the audit", () => {
    const plan = planColourWrite(clean, { textColor: "#ffffff", textPinned: true });
    expect(plan.set).toEqual({
      textColor: "#ffffff",
      sourceTextColor: "#000000",
      textColorPinned: true,
    });
    expect(plan.after).toEqual({ ...none, textColor: "#ffffff", textPinned: true });
  });

  test("a pin-only save pins an existing override and a save without one keeps it", () => {
    const row = { ...clean, textColor: "#000000", sourceTextColor: "#ffffff" };
    const pinned = planColourWrite(row, { textPinned: true });
    expect(pinned.set).toEqual({ textColorPinned: true });
    const kept = planColourWrite({ ...row, ...pinned.set }, { textColor: "#111111" });
    expect(kept.set).toEqual({ textColor: "#111111" });
    expect(kept.after.textPinned).toBe(true);
  });

  test("a reset clears the pin", () => {
    const row = {
      ...clean,
      textColor: "#000000",
      sourceTextColor: "#ffffff",
      textColorPinned: true,
    };
    const plan = planColourWrite(row, { textColor: null, textPinned: true });
    expect(plan.set).toEqual({
      textColor: "#ffffff",
      sourceTextColor: null,
      textColorPinned: null,
    });
    expect(plan.after).toEqual(none);
  });

  test("a pin for a colour with no override is dropped", () => {
    const plan = planColourWrite(clean, { backgroundPinned: true });
    expect(plan.set).toEqual({});
  });
});

describe("planCosmoResolve", () => {
  test("drops a text fill equal to Cosmo's, ignoring case", () => {
    const row = { ...clean, textColor: "#f787bf", sourceTextColor: "#ffffff" };
    const plan = planCosmoResolve(row, "#F787BF");
    expect(plan?.set).toEqual({ sourceTextColor: null });
    expect(plan?.after).toEqual(none);
  });

  test("drops a background fill equal to its padded source, written lowercase", () => {
    const row = { ...clean, backgroundColor: "#e07b36", sourceBackgroundColor: "#E07B36 " };
    const plan = planCosmoResolve(row, null);
    expect(plan?.set).toEqual({ sourceBackgroundColor: null });
    expect({ ...row, ...plan?.set }.backgroundColor).toBe("#e07b36");
  });

  test("leaves a pinned colour equal to Cosmo's", () => {
    const row = {
      ...clean,
      textColor: "#f787bf",
      sourceTextColor: "#ffffff",
      textColorPinned: true,
    };
    expect(planCosmoResolve(row, "#f787bf")).toBeNull();
    expect(differsFromCosmo(row, "#000000")).toEqual({ text: false, background: false });
  });

  test("leaves a differing fill, which Differs from Cosmo lists", () => {
    const row = { ...clean, textColor: "#000000", sourceTextColor: "#ffffff" };
    expect(planCosmoResolve(row, "#2d1f17")).toBeNull();
    expect(differsFromCosmo(row, "#2d1f17")).toEqual({ text: true, background: false });
  });

  test("Cosmo unknown gives neither a change nor a listing", () => {
    const row = { ...clean, textColor: "#000000", sourceTextColor: "#ffffff" };
    expect(planCosmoResolve(row, null)).toBeNull();
    expect(differsFromCosmo(row, null)).toEqual({ text: false, background: false });
  });
});

describe("groupKey", () => {
  const cream373 = { artist: "tripleS", season: "Cream02", collectionNo: "373Z" };

  test("members of one number with the same staff and Cosmo colour share a key", () => {
    expect(groupKey(cream373, "text", "#000000", "#2d1f17")).toBe(
      groupKey(cream373, "text", "#000000", "#2D1F17"),
    );
  });

  test("a different Cosmo colour, season or kind splits them", () => {
    const key = groupKey(cream373, "text", "#000000", "#2d1f17");
    expect(groupKey(cream373, "text", "#000000", "#ffffff")).not.toBe(key);
    expect(groupKey({ ...cream373, season: "Cream01" }, "text", "#000000", "#2d1f17")).not.toBe(
      key,
    );
    expect(groupKey(cream373, "background", "#000000", "#2d1f17")).not.toBe(key);
  });
});

describe("suggestSiblings", () => {
  const member = (slug: string, more: Partial<Parameters<typeof suggestSiblings>[0][number]>) => ({
    slug,
    textColor: "#ffffff",
    overridden: false,
    recordedText: null,
    ...more,
  });

  test("one read member suggests its colour for unread members showing another", () => {
    expect(
      suggestSiblings([
        member("kimlip", { recordedText: "#2D1F17" }),
        member("haseul", {}),
        member("heejin", {}),
        member("jinsoul", {}),
      ]),
    ).toEqual({ colour: "#2d1f17", read: ["kimlip"], unread: ["haseul", "heejin", "jinsoul"] });
  });

  test("leaves out an unread member that already shows the colour or has a staff text colour", () => {
    expect(
      suggestSiblings([
        member("kimlip", { recordedText: "#2d1f17" }),
        member("haseul", { textColor: "#2D1F17" }),
        member("heejin", { textColor: "#000000", overridden: true }),
        member("jinsoul", {}),
      ]),
    ).toEqual({ colour: "#2d1f17", read: ["kimlip"], unread: ["jinsoul"] });
  });

  test("read members that disagree, none read, or none to change give no suggestion", () => {
    expect(
      suggestSiblings([
        member("a", { recordedText: "#000000" }),
        member("b", { recordedText: "#ffffff" }),
        member("c", {}),
      ]),
    ).toBeNull();
    expect(suggestSiblings([member("a", {}), member("b", {})])).toBeNull();
    expect(suggestSiblings([member("a", { recordedText: "#ffffff" }), member("b", {})])).toBeNull();
  });
});

describe("planReplay", () => {
  test("brings a rebuilt row to the entry's colours, keeping the rebuilt one as source", () => {
    const set = planReplay(clean, { textColor: null, backgroundColor: "#df2e37" });
    expect(set).toEqual({ backgroundColor: "#df2e37", sourceBackgroundColor: "#FF7477" });
  });

  test("an entry the row already matches plans nothing", () => {
    const row = { ...clean, backgroundColor: "#df2e37", sourceBackgroundColor: "#FF7477" };
    expect(planReplay(row, { textColor: null, backgroundColor: "#df2e37" })).toBeNull();
  });

  test("an override that equals the rebuilt colour is still marked as staff-set", () => {
    const row = { ...clean, backgroundColor: "#df2e37" };
    const set = planReplay(row, { textColor: null, backgroundColor: "#df2e37" });
    expect(set).toEqual({ sourceBackgroundColor: "#df2e37" });
  });

  test("an entry that reset a colour clears an override the row still carries", () => {
    const row = { ...clean, textColor: "#ffffff", sourceTextColor: "#000000" };
    expect(planReplay(row, { textColor: null, backgroundColor: null })).toEqual({
      textColor: "#000000",
      sourceTextColor: null,
    });
  });
});

describe("isStaffColour", () => {
  test("takes lowercase # and six hex digits only", () => {
    expect(isStaffColour("#07328d")).toBe(true);
    expect(isStaffColour("#07328D")).toBe(false);
    expect(isStaffColour("#fff")).toBe(false);
    expect(isStaffColour(null)).toBe(false);
  });
});
