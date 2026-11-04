import { describe, expect, test } from "bun:test";

import { isStaffColour, planColourWrite, planReplay } from "./collection-colours";

const clean = {
  textColor: "#000000",
  backgroundColor: "#FF7477",
  sourceTextColor: null,
  sourceBackgroundColor: null,
};

describe("planColourWrite", () => {
  test("a colour on a clean row keeps its source beside it", () => {
    const plan = planColourWrite(clean, { textColor: "#ffffff" });
    expect(plan.set).toEqual({ textColor: "#ffffff", sourceTextColor: "#000000" });
    expect(plan.before).toEqual({ textColor: null, backgroundColor: null });
    expect(plan.after).toEqual({ textColor: "#ffffff", backgroundColor: null });
  });

  test("a second save keeps the first source", () => {
    const row = { ...clean, backgroundColor: "#b400ff", sourceBackgroundColor: "#FF7477" };
    const plan = planColourWrite(row, { backgroundColor: "#df2e37" });
    expect(plan.set).toEqual({ backgroundColor: "#df2e37" });
    expect(plan.before).toEqual({ textColor: null, backgroundColor: "#b400ff" });
    expect(plan.after).toEqual({ textColor: null, backgroundColor: "#df2e37" });
  });

  test("a reset puts the source back and clears it", () => {
    const row = { ...clean, backgroundColor: "#df2e37", sourceBackgroundColor: "#FF7477" };
    const plan = planColourWrite(row, { backgroundColor: null });
    expect(plan.set).toEqual({ backgroundColor: "#FF7477", sourceBackgroundColor: null });
    expect(plan.before).toEqual({ textColor: null, backgroundColor: "#df2e37" });
    expect(plan.after).toEqual({ textColor: null, backgroundColor: null });
  });

  test("resetting one of two leaves the other override", () => {
    const row = {
      textColor: "#ffffff",
      backgroundColor: "#d300bb",
      sourceTextColor: "#000000",
      sourceBackgroundColor: "#8A2BE2",
    };
    const plan = planColourWrite(row, { backgroundColor: null });
    expect(plan.set).toEqual({ backgroundColor: "#8A2BE2", sourceBackgroundColor: null });
    expect(plan.after).toEqual({ textColor: "#ffffff", backgroundColor: null });
  });

  test("a reset with no override changes no column", () => {
    const plan = planColourWrite(clean, { textColor: null });
    expect(plan.set).toEqual({});
    expect(plan.before).toEqual({ textColor: null, backgroundColor: null });
    expect(plan.after).toEqual({ textColor: null, backgroundColor: null });
  });

  test("a malformed source is kept as given, so a reset restores it", () => {
    const row = { ...clean, textColor: "#7328D" };
    const set = planColourWrite(row, { textColor: "#07328d" });
    expect(set.set).toEqual({ textColor: "#07328d", sourceTextColor: "#7328D" });

    const saved = { ...row, ...set.set };
    const reset = planColourWrite(saved, { textColor: null });
    expect(reset.set).toEqual({ textColor: "#7328D", sourceTextColor: null });
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
