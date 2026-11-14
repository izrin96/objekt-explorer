import { describe, expect, test } from "bun:test";

import { ONE_POST_NUDGE, WANTED_RULE_NUDGE, declineNudge } from "./decline-nudge";

const both = { suggestWantedOnly: true, suggestOnePost: true };

describe("declineNudge", () => {
  test("an offer that suggests nothing shows nothing", () => {
    expect(declineNudge({}, [])).toBeNull();
    expect(declineNudge({ suggestWantedOnly: false, suggestOnePost: false }, [])).toBeNull();
  });

  test("an unwanted give alone", () => {
    expect(declineNudge({ suggestWantedOnly: true }, [])).toBe("wanted");
  });

  test("asks across posts alone", () => {
    expect(declineNudge({ suggestOnePost: true }, [])).toBe("one-post");
  });

  test("both apply: Only offers with what I want goes first", () => {
    expect(declineNudge(both, [])).toBe("wanted");
  });

  test("both apply and the first has shown: the posts notice", () => {
    expect(declineNudge(both, [WANTED_RULE_NUDGE])).toBe("one-post");
  });

  test("both apply and the posts notice has shown: still the first", () => {
    expect(declineNudge(both, [ONE_POST_NUDGE])).toBe("wanted");
  });

  test("each shows once in a browser", () => {
    expect(declineNudge(both, [WANTED_RULE_NUDGE, ONE_POST_NUDGE])).toBeNull();
    expect(declineNudge({ suggestWantedOnly: true }, [WANTED_RULE_NUDGE])).toBeNull();
    expect(declineNudge({ suggestOnePost: true }, [ONE_POST_NUDGE])).toBeNull();
  });
});
