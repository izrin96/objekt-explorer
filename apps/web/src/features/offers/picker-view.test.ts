import { describe, expect, it } from "bun:test";

import { NO_PICKER_FILTERS } from "@/features/filters/picker-filters";

import { emptyReason, viewActiveCount, viewInput, type PickerView } from "./picker-view";

const DEFAULT: PickerView = { sort: "default", hideUntransferable: false };
const HIDE: PickerView = { sort: "default", hideUntransferable: true };
const bare = { ...NO_PICKER_FILTERS, matchOnly: false };
const matching = { ...bare, matchOnly: true };
const searching = { ...bare, search: "101" };

describe("viewInput", () => {
  it("sends nothing for the default view", () => {
    expect(viewInput(DEFAULT)).toEqual({});
  });
  it("sends only the sort that is not the default", () => {
    expect(viewInput({ sort: "collectionNo", hideUntransferable: false })).toEqual({
      sort: "collectionNo",
    });
  });
  it("sends only the switch when it is on", () => {
    expect(viewInput(HIDE)).toEqual({ transferableOnly: true });
  });
  it("sends both when both are set", () => {
    expect(viewInput({ sort: "collectionNo", hideUntransferable: true })).toEqual({
      sort: "collectionNo",
      transferableOnly: true,
    });
  });
});

describe("viewActiveCount", () => {
  it("counts the switch and never the sort", () => {
    expect(viewActiveCount(DEFAULT)).toBe(0);
    expect(viewActiveCount({ sort: "collectionNo", hideUntransferable: false })).toBe(0);
    expect(viewActiveCount(HIDE)).toBe(1);
  });
});

describe("emptyReason", () => {
  it("says filtered when a search or facet is set, whatever the switches", () => {
    expect(emptyReason(searching, HIDE, false)).toEqual({ reason: "filtered", turnOff: false });
    expect(emptyReason({ ...matching, search: "x" }, DEFAULT, false)).toEqual({
      reason: "filtered",
      turnOff: false,
    });
    expect(emptyReason({ ...bare, member: ["a"] }, DEFAULT, false).reason).toBe("filtered");
  });
  it("blames the match switch alone, with Turn off unless locked", () => {
    expect(emptyReason(matching, DEFAULT, false)).toEqual({ reason: "match", turnOff: true });
    expect(emptyReason(matching, DEFAULT, true)).toEqual({ reason: "match", turnOff: false });
  });
  it("blames the hide switch alone, with Turn off", () => {
    expect(emptyReason(bare, HIDE, false)).toEqual({ reason: "hide", turnOff: true });
  });
  it("says filtered when both switches are on", () => {
    expect(emptyReason(matching, HIDE, false)).toEqual({ reason: "filtered", turnOff: false });
  });
  it("says filtered under the locked match with the hide switch on", () => {
    expect(emptyReason(matching, HIDE, true)).toEqual({ reason: "filtered", turnOff: false });
  });
  it("falls to the plain line when nothing narrows", () => {
    expect(emptyReason(bare, DEFAULT, false)).toEqual({ reason: "plain", turnOff: false });
  });
});
